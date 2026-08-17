import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { AvatarService } from '../../services/AvatarService';


interface CentralPlazaEngineProps {
  roomId?: string;
  roomType?: string;
  onInteract: (msg: string) => void;
  onOpenProfile?: (username: string) => void;
  onPresenceUpdate?: (count: number) => void;
  onChatMessage?: (message: { id: number, author: string, text: string, isSystem: boolean }) => void;
  outboundChatMessage?: string | null;
}

export function CentralPlazaEngine({ roomId, roomType, onInteract, onOpenProfile, onPresenceUpdate, onChatMessage, outboundChatMessage }: CentralPlazaEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  console.log("Rendering room", roomId, roomType);
  const interactRef = useRef(onInteract);
  const openProfileRef = useRef(onOpenProfile);
  const presenceRef = useRef(onPresenceUpdate);
  const chatRef = useRef(onChatMessage);

  const [fps, setFps] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && outboundChatMessage) {
      wsRef.current.send(JSON.stringify({ type: 'chat', text: outboundChatMessage }));
    }
  }, [outboundChatMessage]);

  // Always keep the latest callback without triggering effect re-runs
  useEffect(() => {
    interactRef.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    openProfileRef.current = onOpenProfile;
  }, [onOpenProfile]);

  useEffect(() => {
    presenceRef.current = onPresenceUpdate;
  }, [onPresenceUpdate]);

  useEffect(() => {
    chatRef.current = onChatMessage;
  }, [onChatMessage]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize PIXI Application
    const app = new PIXI.Application({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: 0x09090b, // zinc-950
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true
    });

    containerRef.current.appendChild(app.view as HTMLCanvasElement);

    // Create a container to handle the Isometric transform
    const isoContainer = new PIXI.Container();

    // Center it
    isoContainer.x = app.screen.width / 2;
    isoContainer.y = app.screen.height / 2;

    // Scale and skew to achieve roughly 2.5D isometric view
    isoContainer.scale.y = 0.5;
    isoContainer.rotation = Math.PI / 4;

    app.stage.addChild(isoContainer);


    const getColorForName = (name: string) => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
      return parseInt("00000".substring(0, 6 - c.length) + c, 16);
    };

    // --- 1. Floor Generation ---
    const floorSize = 800;
    const floorGraphics = new PIXI.Graphics();

    floorGraphics.beginFill(0x18181b); // zinc-900
    floorGraphics.lineStyle(1, 0x27272a, 1); // zinc-800
    floorGraphics.drawRect(-floorSize/2, -floorSize/2, floorSize, floorSize);
    floorGraphics.endFill();

    floorGraphics.lineStyle(1, 0x27272a, 0.5);
    for(let i = -floorSize/2; i <= floorSize/2; i+=40) {
      floorGraphics.moveTo(i, -floorSize/2);
      floorGraphics.lineTo(i, floorSize/2);
      floorGraphics.moveTo(-floorSize/2, i);
      floorGraphics.lineTo(floorSize/2, i);
    }
    isoContainer.addChild(floorGraphics);

    // Interactive floor for player movement
    floorGraphics.interactive = true;

    // Player Character
    const player = new PIXI.Graphics();
    const localAvatarState = AvatarService.getAvatar("dev-user-1");
    player.beginFill(localAvatarState.baseColor);
    player.drawCircle(0, 0, 15);
    player.endFill();
    player.x = 0;
    player.y = 0;

    const playerLabel = new PIXI.Text('You', {
      fontFamily: 'sans-serif',
      fontSize: 14,
      fill: 0xffffff,
      align: 'center'
    });
    playerLabel.rotation = -Math.PI / 4;
    playerLabel.scale.y = 2.0;
    playerLabel.anchor.set(0.5, 1.5);
    player.addChild(playerLabel);

    isoContainer.addChild(player);

    let playerTargetX = 0;
    let playerTargetY = 0;

    floorGraphics.on('pointerdown', (e) => {
      const localPos = e.data.getLocalPosition(isoContainer);
      // Boundary check
      const bound = floorSize/2 - 20;
      playerTargetX = Math.max(-bound, Math.min(bound, localPos.x));
      playerTargetY = Math.max(-bound, Math.min(bound, localPos.y));
    });

    // --- 2. Interactive Objects (Cafe, Bench, Arcade) ---
    const createObject = (x: number, y: number, w: number, h: number, color: number, message: string) => {
      const obj = new PIXI.Graphics();
      obj.beginFill(color);
      obj.lineStyle(1, 0xffffff, 0.2);
      obj.drawRect(x, y, w, h);
      obj.endFill();

      obj.interactive = true;
      obj.cursor = 'pointer';
      obj.on('pointerdown', (e) => {
        e.stopPropagation(); // prevent floor click
        interactRef.current(message);
        // Move player to object
        playerTargetX = x + w/2;
        playerTargetY = y + h + 20; // stand in front
      });
      isoContainer.addChild(obj);
      return obj;
    };


    if (roomType === 'cafe') {
      createObject(-100, -100, 200, 80, 0x1e3a8a, "You ordered a digital espresso.");
      createObject(-150, 50, 40, 40, 0x475569, "You sit at a cafe table.");
      createObject(100, 50, 40, 40, 0x475569, "You sit at a cafe table.");
    } else if (roomType === 'arcade') {
      createObject(-150, -150, 60, 60, 0x4c1d95, "You interact with the Neon Arcade machine. Loading mini-game...");
      createObject(-50, -150, 60, 60, 0xbe185d, "Playing Dance Dance Virtual...");
      createObject(50, -150, 60, 60, 0x4338ca, "Playing Space Invaders 3000...");
    } else if (roomType === 'gallery') {
      createObject(-200, -100, 20, 200, 0x7e22ce, "Viewing abstract digital art piece #1.");
      createObject(180, -100, 20, 200, 0xbe123c, "Viewing abstract digital art piece #2.");
    } else if (roomType === 'lounge') {
      createObject(-100, -50, 200, 100, 0x065f46, "Relaxing on the lounge sofa.");
    } else if (roomType === 'shop') {
      createObject(-100, -150, 200, 60, 0xb45309, "Browsing digital goods at the shop counter.");
      createObject(-100, 50, 60, 60, 0x475569, "Looking at a display rack.");
    } else {
      // Default Plaza
      createObject(-200, -200, 160, 160, 0x1e3a8a, "You enter Luna's Cafe. The smell of digital espresso fills the air.");
      createObject(100, 100, 80, 40, 0x064e3b, "You sit on the bench and watch the humans pass by.");
      createObject(-50, 200, 80, 80, 0x4c1d95, "You interact with the Neon Arcade machine. Loading mini-game...");
    }


    // --- 3. Multiplayer Realtime Connection ---
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    const remotePlayers = new Map<string, { graphics: PIXI.Graphics, targetX: number, targetY: number }>();

    const updatePresence = () => {
      presenceRef.current?.(remotePlayers.size + 1); // +1 for local player
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomId: roomId || 'central-plaza' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        data.state.forEach((p: any) => {
          if (p.id !== data.id && !remotePlayers.has(p.id)) {
            spawnRemotePlayer(p.id, p.x, p.y, p.name);
          }
        });
        updatePresence();
      } else if (data.type === 'join') {
        spawnRemotePlayer(data.id, data.x, data.y, data.name);
        updatePresence();
      } else if (data.type === 'leave') {
        const rp = remotePlayers.get(data.id);
        if (rp) {
          isoContainer.removeChild(rp.graphics);
          remotePlayers.delete(data.id);
        }
        updatePresence();
      } else if (data.type === 'move') {
        const rp = remotePlayers.get(data.id);
        if (rp) {
          rp.targetX = data.x;
          rp.targetY = data.y;
        }
      } else if (data.type === 'chat') {
        chatRef.current?.({
          id: Date.now() + Math.random(),
          author: data.name,
          text: data.text,
          isSystem: false
        });
      }
    };

    const spawnRemotePlayer = (id: string, x: number, y: number, name: string) => {
      const rpGraphics = new PIXI.Graphics();
      rpGraphics.beginFill(getColorForName(name));
      rpGraphics.drawCircle(0, 0, 15);
      rpGraphics.endFill();
      rpGraphics.x = x;
      rpGraphics.y = y;

      rpGraphics.interactive = true;
      rpGraphics.cursor = 'pointer';
      rpGraphics.on('pointerdown', (e) => {
        e.stopPropagation();
        openProfileRef.current?.(name);
      });

      const label = new PIXI.Text(name, {
        fontFamily: 'sans-serif',
        fontSize: 14,
        fill: 0xffffff,
        align: 'center'
      });
      label.rotation = -Math.PI / 4;
      label.scale.y = 2.0;
      label.anchor.set(0.5, 1.5);
      rpGraphics.addChild(label);

      isoContainer.addChild(rpGraphics);
      remotePlayers.set(id, { graphics: rpGraphics, targetX: x, targetY: y });
    };

    let lastFpsUpdate = 0;
    let lastNetworkUpdate = 0;

    // Main Game Loop
    app.ticker.add((delta) => {
      const now = performance.now();
      if (now - lastFpsUpdate > 1000) {
        setFps(Math.round(app.ticker.FPS));
        lastFpsUpdate = now;
      }

      // Player Movement
      const pdx = playerTargetX - player.x;
      const pdy = playerTargetY - player.y;
      const pdist = Math.sqrt(pdx*pdx + pdy*pdy);

      let isMoving = false;
      if (pdist > 5) {
        player.x += (pdx / pdist) * 4 * delta;
        player.y += (pdy / pdist) * 4 * delta;
        isMoving = true;
      }

      // Broadcast local movement
      if (isMoving && now - lastNetworkUpdate > 100 && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'move', x: player.x, y: player.y }));
        lastNetworkUpdate = now;
      }

      // Camera Follows Player
      isoContainer.x = app.screen.width / 2 - (player.x * Math.cos(Math.PI/4) - player.y * Math.sin(Math.PI/4));
      isoContainer.y = app.screen.height / 2 - (player.x * Math.sin(Math.PI/4) + player.y * Math.cos(Math.PI/4)) * 0.5;

      // Remote Player Movement Smoothing
      remotePlayers.forEach(rp => {
        const dx = rp.targetX - rp.graphics.x;
        const dy = rp.targetY - rp.graphics.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 2) {
          rp.graphics.x += (dx / dist) * 4 * delta;
          rp.graphics.y += (dy / dist) * 4 * delta;
        }
      });
    });

    // Cleanup
    return () => {
      ws.close();
      app.destroy(true, { children: true });
    };
  }, [roomId, roomType]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 touch-none" />
      <div className="absolute top-2 left-2 bg-black/50 text-emerald-400 text-xs px-2 py-1 rounded font-mono z-50 pointer-events-none">
        FPS: {fps} | Engine: PIXI.js WebGL (2.5D Mode)
      </div>
    </div>
  );
}
