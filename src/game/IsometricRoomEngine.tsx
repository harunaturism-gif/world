import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { AvatarRenderer } from './AvatarRenderer';
import { renderBorders } from './BorderRenderer';
import { CameraController } from './CameraController';
import { renderFloor } from './FloorRenderer';
import { isoDepth, isoToScreen, type IsoPoint, screenToIso, TILE_HEIGHT, TILE_WIDTH } from './isometric';
import { RoomEngineCore } from './openHotel/RoomEngineCore';
import type { RoomUserFrame } from './openHotel/RoomUser';
import type { RoomUser } from './openHotel/RoomUser';
import { RoomGeometry } from './RoomGeometry';
import type { PlayerSpeech, RoomAvatarDefinition, RoomDefinition, RoomSelection } from './roomEngine';
import { worldAssets } from './worldManifest';

interface Props {
  room: RoomDefinition;
  onInteract: (message: string) => void;
  onEnterRoom?: (roomId: string) => void;
  onOpenProfile?: (username: string) => void;
  onPresenceUpdate?: (count: number) => void;
  playerSpeech?: PlayerSpeech | null;
}

interface Actor {
  id: string;
  node: PIXI.Container;
  visual: AvatarRenderer;
  shadow: PIXI.Sprite;
  user: RoomUser;
  patrol: IsoPoint[];
  waypointIndex: number;
  nextMoveAt: number;
  stepTravel: number;
  bubble?: PIXI.Container;
  bubbleExpiresAt: number;
  ambientSpeech: string[];
  speechIndex: number;
  nextSpeechAt: number;
  pose: 'stand' | 'sit';
  depthBias: number;
}

interface AnimatedObject {
  node: PIXI.Container;
  sprite: PIXI.Sprite;
  baseY: number;
  mode: 'glow' | 'float' | 'sway';
  offset: number;
  baseRotation: number;
}

interface Footstep { graphic: PIXI.Graphics; life: number }
interface AmbientParticle { graphic: PIXI.Graphics; baseY: number; phase: number }
interface SceneRuntime { say: (text: string) => void; zoomBy: (amount: number) => void; recenter: () => void }

const snapToTile = (point: IsoPoint): IsoPoint => ({ x: Math.round(point.x * 2) / 2, y: Math.round(point.y * 2) / 2 });

export function IsometricRoomEngine({ room, onInteract, onEnterRoom, onOpenProfile, onPresenceUpdate, playerSpeech }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<SceneRuntime | null>(null);
  const [selection, setSelection] = useState<RoomSelection | null>(null);

  const runAction = () => {
    if (!selection) return;
    if (selection.action === 'enter-room' && selection.targetId) {
      onInteract(`Entering ${selection.title}…`);
      runtime.current?.say(`Let's go to ${selection.title}.`);
      window.setTimeout(() => onEnterRoom?.(selection.targetId!), 260);
    } else if (selection.action === 'view-profile' && selection.targetId) {
      onOpenProfile?.(selection.targetId);
    } else {
      onInteract(`${selection.actionLabel}: ${selection.title}`);
      runtime.current?.say(selection.action === 'sit' ? 'Taking a quick break.' : selection.actionLabel);
    }
  };

  useEffect(() => {
    if (playerSpeech?.text) runtime.current?.say(playerSpeech.text);
  }, [playerSpeech]);

  useEffect(() => {
    const hostElement = host.current;
    if (!hostElement) return;
    const app = new PIXI.Application({
      resizeTo: hostElement,
      backgroundColor: 0x17343d,
      antialias: true,
      resolution: Math.min(devicePixelRatio, 2),
      autoDensity: true,
    });
    hostElement.appendChild(app.view as HTMLCanvasElement);
    const atmosphere = new PIXI.Graphics();
    const scene = new PIXI.Container();
    scene.sortableChildren = true;
    app.stage.addChild(atmosphere, scene);
    const renderAtmosphere = () => {
      const { width, height } = app.screen;
      atmosphere.clear();
      atmosphere.beginFill(0x172f35);
      atmosphere.drawRect(0, 0, width, height);
      atmosphere.endFill();
      atmosphere.beginFill(0x594f57, 0.42);
      atmosphere.drawEllipse(-width * 0.08, height * 0.44, width * 0.56, height * 0.78);
      atmosphere.drawEllipse(width * 1.04, height * 0.58, width * 0.54, height * 0.86);
      atmosphere.endFill();
      atmosphere.beginFill(0x9b674f, 0.18);
      atmosphere.drawEllipse(width * 0.12, height * 0.96, width * 0.5, height * 0.27);
      atmosphere.drawEllipse(width * 0.82, height * 0.06, width * 0.42, height * 0.2);
      atmosphere.endFill();
      atmosphere.beginFill(0xf2d995, 0.045);
      for (let index = 0; index < 18; index += 1) {
        atmosphere.drawCircle((index * 173) % Math.max(width, 1), (index * 97) % Math.max(height, 1), 2 + (index % 3));
      }
      atmosphere.endFill();
    };
    renderAtmosphere();
    const keys = new Set<string>();
    const footsteps: Footstep[] = [];
    const ambientParticles: AmbientParticle[] = [];
    const camera = new CameraController();
    const geometry = new RoomGeometry(room.geometry);
    const core = new RoomEngineCore(room.id, {
      staticBlocked: (point) => geometry.isBlocked(point, room.objects),
      canTraverse: (from, to) => geometry.canTraverse(from, to, room.objects),
      elevationAt: (point) => geometry.elevationAt(point),
    });
    let disposed = false;
    let removeWheel = () => {};
    let player: Actor;

    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      keys.add(key);
    };
    const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    addEventListener('keydown', keyDown);
    addEventListener('keyup', keyUp);

    void (async () => {
      const floorAssets = Object.values(room.floor.materials).flat();
      const avatarAssets = room.avatars.flatMap((avatar) => avatar.appearance.layers.map((layer) => layer.asset));
      const wallAssets = room.geometry.walls.flatMap((wall) => wall.asset ? [wall.asset] : []);
      const urls = Array.from(new Set([...floorAssets, ...wallAssets, worldAssets.avatarShadow, ...avatarAssets, ...room.objects.map((object) => object.asset)]));
      const textureEntries = await Promise.all(urls.map(async (url) => [url, await PIXI.Assets.load<PIXI.Texture>(url)] as const));
      if (disposed) return;
      const textures = new Map<string, PIXI.Texture>(textureEntries);
      const textureFor = (url: string) => textures.get(url) ?? PIXI.Texture.EMPTY;
      onPresenceUpdate?.(room.avatars.length);

      renderFloor(scene, room, geometry, textureFor);
      renderBorders(scene, geometry, textureFor);

      const tileCursor = new PIXI.Graphics();
      tileCursor.visible = false;
      scene.addChild(tileCursor);
      const drawTileCursor = (point: IsoPoint, occupied: boolean) => {
        const world = geometry.worldPoint(point);
        const screen = isoToScreen(world);
        tileCursor.clear();
        tileCursor.lineStyle(2, occupied ? 0xef7188 : 0xffe39a, 0.9);
        tileCursor.beginFill(occupied ? 0xef5472 : 0xffd166, occupied ? 0.08 : 0.1);
        tileCursor.drawPolygon([0, -TILE_HEIGHT / 4, TILE_WIDTH / 4, 0, 0, TILE_HEIGHT / 4, -TILE_WIDTH / 4, 0]);
        tileCursor.endFill();
        tileCursor.position.set(screen.x, screen.y);
        tileCursor.zIndex = isoDepth(world) - 2;
        tileCursor.visible = true;
      };

      const selectionRing = new PIXI.Graphics();
      selectionRing.lineStyle(2.5, 0xffe38a, 0.92);
      selectionRing.beginFill(0xffd166, 0.06);
      selectionRing.drawEllipse(0, 0, 31, 11);
      selectionRing.endFill();
      selectionRing.visible = false;
      scene.addChild(selectionRing);
      const placeSelectionRing = (point: IsoPoint) => {
        const world = geometry.worldPoint(point);
        const screen = isoToScreen(world);
        selectionRing.position.set(screen.x, screen.y + 2);
        selectionRing.zIndex = isoDepth(world) - 1;
        selectionRing.visible = true;
      };

      const insideFloor = (point: IsoPoint) => Boolean(geometry.cellAt(point));
      const blocked = (point: IsoPoint) => geometry.isBlocked(point, room.objects);
      const routeActor = (actor: Actor, target: IsoPoint) => {
        return core.routeUser(actor.id, snapToTile(target), true);
      };
      const animatedObjects: AnimatedObject[] = [];

      room.objects.forEach((definition, index) => {
        const node = new PIXI.Container();
        const sprite = new PIXI.Sprite(textureFor(definition.asset));
        const world = geometry.worldPoint(definition.position);
        const screen = isoToScreen(world);
        sprite.anchor.set(definition.anchor?.x ?? 0.5, definition.anchor?.y ?? 1);
        sprite.width = definition.displayWidth;
        sprite.scale.y = Math.abs(sprite.scale.x);
        if (definition.direction === 2) sprite.scale.x *= -1;
        node.addChild(sprite);
        node.position.set(screen.x, screen.y);
        node.zIndex = isoDepth(geometry.worldPoint(definition.depthBase ?? definition.position)) + (definition.depthBias ?? 0);
        node.name = definition.id;

        if (definition.interaction) {
          const badge = new PIXI.Graphics();
          badge.beginFill(0x172238, 0.9);
          badge.lineStyle(2, 0xffe38a, 0.62);
          badge.drawCircle(0, 0, 12);
          badge.endFill();
          badge.y = -sprite.height - 9;
          const icon = new PIXI.Text(definition.interaction.icon ?? '✦', { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: 0xffe38a });
          icon.anchor.set(0.5);
          badge.addChild(icon);
          node.addChild(badge);
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          sprite.on('pointerover', () => { node.scale.set(1.025); badge.scale.set(1.12); });
          sprite.on('pointerout', () => { node.scale.set(1); badge.scale.set(1); });
          sprite.on('pointertap', (event) => {
            event.stopPropagation();
            placeSelectionRing(definition.position);
            setSelection({ ...definition.interaction!, sourceId: definition.id });
            onInteract(definition.interaction!.description);
            if (definition.interactionPoint) routeActor(player, definition.interactionPoint);
          });
        }

        if (definition.id === 'fountain') {
          for (let particleIndex = 0; particleIndex < 7; particleIndex += 1) {
            const particle = new PIXI.Graphics();
            particle.beginFill(particleIndex % 2 === 0 ? 0xa9efff : 0xffefad, 0.78);
            particle.drawCircle(0, 0, particleIndex % 3 === 0 ? 2.2 : 1.4);
            particle.endFill();
            particle.x = (particleIndex - 3) * 11;
            particle.y = -sprite.height * 0.54 - (particleIndex % 3) * 7;
            node.addChild(particle);
            ambientParticles.push({ graphic: particle, baseY: particle.y, phase: particleIndex * 0.82 });
          }
        }
        if (definition.id === 'dj-stage') {
          for (let particleIndex = 0; particleIndex < 10; particleIndex += 1) {
            const particle = new PIXI.Graphics();
            particle.beginFill(particleIndex % 2 === 0 ? 0x6fe7ef : 0xff806c, 0.86);
            particle.drawRoundedRect(-2, -2, 4, 4, 1);
            particle.endFill();
            particle.x = -54 + particleIndex * 12;
            particle.y = -sprite.height * 0.46 + (particleIndex % 3) * 5;
            node.addChild(particle);
            ambientParticles.push({ graphic: particle, baseY: particle.y, phase: particleIndex * 0.37 });
          }
        }
        if (definition.ambient) animatedObjects.push({ node, sprite, baseY: sprite.y, mode: definition.ambient, offset: index, baseRotation: sprite.rotation });
        scene.addChild(node);
      });

      const showSpeech = (actor: Actor, value: string) => {
        if (actor.bubble) {
          actor.node.removeChild(actor.bubble);
          actor.bubble.destroy({ children: true });
        }
        const text = new PIXI.Text(value.slice(0, 72), { fontFamily: 'Arial', fontSize: 12.5, fontWeight: '600', fill: 0xf7fbfa, align: 'center', wordWrap: true, wordWrapWidth: 150, lineHeight: 17 });
        const width = Math.max(58, Math.min(166, text.width + 24));
        const height = text.height + 18;
        const background = new PIXI.Graphics();
        background.beginFill(0x102b32, 0.96);
        background.lineStyle(1.5, 0x9af3dc, 0.52);
        background.drawRoundedRect(-width / 2, -height, width, height, 13);
        background.moveTo(-8, 0);
        background.lineTo(0, 8);
        background.lineTo(8, 0);
        background.closePath();
        background.endFill();
        text.anchor.set(0.5, 1);
        text.y = -8;
        const bubble = new PIXI.Container();
        bubble.addChild(background, text);
        bubble.y = -108;
        bubble.zIndex = 20;
        actor.node.addChild(bubble);
        actor.bubble = bubble;
        actor.bubbleExpiresAt = app.ticker.lastTime + 3000;
      };

      const makeActor = (definition: RoomAvatarDefinition, index: number): Actor => {
        const position = definition.player ? geometry.spawn : definition.position;
        const node = new PIXI.Container();
        const shadow = new PIXI.Sprite(textureFor(worldAssets.avatarShadow));
        const visual = new AvatarRenderer(definition.appearance, textureFor);
        shadow.anchor.set(0.5, 1);
        shadow.width = 76;
        shadow.scale.y = shadow.scale.x;
        shadow.alpha = 0.32;
        if (definition.player) {
          const playerHalo = new PIXI.Graphics();
          playerHalo.lineStyle(2, 0xffd76a, 0.72);
          playerHalo.beginFill(0xffd76a, 0.08);
          playerHalo.drawEllipse(0, -2, 29, 10);
          playerHalo.endFill();
          node.addChild(shadow, playerHalo, visual);
        } else node.addChild(shadow, visual);

        const nameText = new PIXI.Text(definition.name, { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: definition.player ? 0xffe38a : 0xffffff });
        nameText.anchor.set(0.5);
        const nameplate = new PIXI.Container();
        const plate = new PIXI.Graphics();
        plate.beginFill(0x101827, 0.9);
        plate.lineStyle(1, definition.player ? 0xffd166 : 0x7ee8d0, 0.4);
        plate.drawRoundedRect(-nameText.width / 2 - 9, -10, nameText.width + 18, 20, 9);
        plate.endFill();
        const status = new PIXI.Graphics();
        status.beginFill(0x55e6ad);
        status.drawCircle(-nameText.width / 2 - 4, 0, 3);
        status.endFill();
        nameplate.addChild(plate, status, nameText);
        nameplate.y = -93;
        node.addChild(nameplate);

        const actor: Actor = {
          id: definition.id,
          node,
          visual,
          shadow,
          user: core.addUser(definition.id, position, definition.player ? 2.45 : 1.05),
          patrol: definition.patrol ?? [],
          waypointIndex: 0,
          nextMoveAt: 1800 + index * 820,
          stepTravel: 0,
          bubbleExpiresAt: 0,
          ambientSpeech: definition.ambientSpeech ?? [],
          speechIndex: 0,
          nextSpeechAt: 6200 + index * 3600,
          pose: definition.pose ?? 'stand',
          depthBias: definition.depthBias ?? 1,
        };
        if (actor.pose === 'sit') {
          actor.patrol = [];
          visual.scale.y = 0.82;
          visual.y = 9;
          shadow.alpha = 0.2;
          nameplate.y = -82;
        }
        if (!definition.player) {
          visual.eventMode = 'static';
          visual.cursor = 'pointer';
          visual.hitArea = new PIXI.Rectangle(-42, -118, 84, 120);
          visual.on('pointerover', () => node.scale.set(1.035));
          visual.on('pointerout', () => node.scale.set(1));
          visual.on('pointertap', (event) => {
            event.stopPropagation();
            placeSelectionRing(actor.user.iso);
            setSelection({ sourceId: definition.id, title: definition.name, description: definition.activity ?? `${definition.name} is spending time in ${room.name}.`, actionLabel: 'View Profile', action: 'view-profile', targetId: definition.name, icon: '●' });
            showSpeech(actor, `Hey! I'm ${definition.name}.`);
            onInteract(`${definition.name} waves hello.`);
            const dx = player.user.iso.x - actor.user.iso.x;
            const dy = player.user.iso.y - actor.user.iso.y;
            const distance = Math.max(Math.hypot(dx, dy), 1);
            routeActor(player, { x: actor.user.iso.x + dx / distance * 0.9, y: actor.user.iso.y + dy / distance * 0.9 });
          });
        }
        scene.addChild(node);
        return actor;
      };

      const actors = room.avatars.map(makeActor);
      player = actors.find((_, index) => room.avatars[index].player) ?? actors[0];
      const residents = actors.filter((actor) => actor !== player);
      const placeActor = (actor: Actor) => {
        const world = geometry.worldPoint(actor.user.iso);
        const screen = isoToScreen(world);
        actor.node.position.set(screen.x, screen.y);
        actor.node.zIndex = isoDepth(world) + actor.depthBias;
      };
      actors.forEach(placeActor);
      runtime.current = { say: (text) => showSpeech(player, text), zoomBy: (amount) => camera.zoomBy(amount), recenter: () => camera.recenter() };

      const spawnFootstep = (position: IsoPoint) => {
        const world = geometry.worldPoint(position);
        const screen = isoToScreen(world);
        const graphic = new PIXI.Graphics();
        graphic.beginFill(0x233f4a, 0.16);
        graphic.drawEllipse(0, 0, 9, 3);
        graphic.endFill();
        graphic.position.set(screen.x, screen.y);
        graphic.zIndex = isoDepth(world) - 3;
        scene.addChild(graphic);
        footsteps.push({ graphic, life: 1 });
      };

      const updateActorVisual = (actor: Actor, frame: RoomUserFrame, isPlayer: boolean) => {
        if (actor.pose === 'sit') {
          actor.visual.setFrame('south', 0);
          actor.visual.y = 9 + Math.sin(app.ticker.lastTime / 780) * 0.25;
          actor.shadow.alpha = 0.2;
          placeActor(actor);
          return;
        }
        actor.visual.setFrame(frame.direction, frame.animationFrame);
        actor.visual.y = frame.motion === 'idle' ? Math.sin(app.ticker.lastTime / 780) * 0.35 : Math.sin(app.ticker.lastTime / 82) * 0.7;
        actor.shadow.alpha = frame.motion === 'walk' ? 0.24 : 0.31;
        if (isPlayer && frame.moved > 0) {
          actor.stepTravel += frame.moved;
          if (actor.stepTravel > 0.5) {
            spawnFootstep(actor.user.iso);
            actor.stepTravel = 0;
          }
        }
        placeActor(actor);
      };

      scene.eventMode = 'static';
      const floorBounds = geometry.projectedFloorBounds();
      const visualBounds = scene.getLocalBounds();
      const minX = Math.min(floorBounds.x, visualBounds.x) - 36;
      const minY = Math.min(floorBounds.y, visualBounds.y) - 30;
      const maxX = Math.max(floorBounds.x + floorBounds.width, visualBounds.x + visualBounds.width) + 36;
      const maxY = Math.max(floorBounds.y + floorBounds.height, visualBounds.y + visualBounds.height) + 30;
      const roomBounds = new PIXI.Rectangle(minX, minY, maxX - minX, maxY - minY);
      camera.configure(roomBounds, geometry.spawn);
      scene.hitArea = new PIXI.Rectangle(roomBounds.x - 100, roomBounds.y - 100, roomBounds.width + 200, roomBounds.height + 200);
      let dragStart: PIXI.Point | null = null;
      let dragged = false;
      const activePointers = new Map<number, PIXI.Point>();
      let pinchDistance = 0;
      scene.on('pointerdown', (event) => {
        activePointers.set(event.pointerId, event.global.clone());
        if (activePointers.size === 2) {
          const [first, second] = [...activePointers.values()];
          pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
          dragStart = null;
          return;
        }
        dragStart = event.global.clone();
        dragged = false;
      });
      scene.on('pointermove', (event) => {
        if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, event.global.clone());
        if (activePointers.size === 2) {
          const [first, second] = [...activePointers.values()];
          const distance = Math.hypot(second.x - first.x, second.y - first.y);
          if (pinchDistance > 0) camera.zoomBy((distance - pinchDistance) / 280);
          pinchDistance = distance;
          dragged = true;
          return;
        }
        if (dragStart) {
          const next = event.global;
          const dx = next.x - dragStart.x;
          const dy = next.y - dragStart.y;
          if (Math.hypot(dx, dy) > 2) {
            camera.panBy(dx, dy);
            dragStart.copyFrom(next);
            dragged = true;
          }
          return;
        }
        const target = snapToTile(screenToIso(event.getLocalPosition(scene)));
        if (!insideFloor(target)) { tileCursor.visible = false; return; }
        drawTileCursor(target, blocked(target));
      });
      const releasePointer = (event: PIXI.FederatedPointerEvent) => {
        activePointers.delete(event.pointerId);
        pinchDistance = 0;
        dragStart = null;
      };
      scene.on('pointerup', releasePointer);
      scene.on('pointerupoutside', releasePointer);
      scene.on('pointerout', (event) => { tileCursor.visible = false; releasePointer(event); });
      scene.on('pointertap', (event) => {
        if (dragged) { dragged = false; return; }
        const target = snapToTile(screenToIso(event.getLocalPosition(scene)));
        if (!blocked(target) && routeActor(player, target)) {
          placeSelectionRing(target);
          setSelection(null);
        } else {
          onInteract('That spot is not reachable. Choose another tile.');
        }
      });
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        camera.zoomBy(event.deltaY < 0 ? 0.08 : -0.08);
      };
      hostElement.addEventListener('wheel', onWheel, { passive: false });
      removeWheel = () => hostElement.removeEventListener('wheel', onWheel);

      let playerMoving = false;
      const layout = (immediate = false) => camera.layout(scene, app.screen, geometry.worldPoint(player.user.iso), playerMoving, immediate);
      const onResize = () => { renderAtmosphere(); layout(true); };
      app.renderer.on('resize', onResize);
      layout(true);

      app.ticker.add((delta) => {
        const time = app.ticker.lastTime;
        const deltaMs = app.ticker.deltaMS;
        const deltaSeconds = deltaMs / 1000;
        let dx = 0;
        let dy = 0;
        const keyboardStep = 2.45 * deltaSeconds;
        if (keys.has('w') || keys.has('arrowup')) { dx -= keyboardStep; dy -= keyboardStep; }
        if (keys.has('s') || keys.has('arrowdown')) { dx += keyboardStep; dy += keyboardStep; }
        if (keys.has('a') || keys.has('arrowleft')) { dx -= keyboardStep; dy += keyboardStep; }
        if (keys.has('d') || keys.has('arrowright')) { dx += keyboardStep; dy -= keyboardStep; }
        const playerFrame = dx || dy
          ? core.moveUserDirect(player.id, { x: dx, y: dy }, deltaMs)
          : core.tickUser(player.id, deltaSeconds, time);
        if (!playerFrame) return;
        playerMoving = playerFrame.moving;
        updateActorVisual(player, playerFrame, true);

        residents.forEach((actor, index) => {
          if (!actor.user.moving && actor.patrol.length > 1 && time > actor.nextMoveAt) {
            actor.waypointIndex = (actor.waypointIndex + 1) % actor.patrol.length;
            routeActor(actor, actor.patrol[actor.waypointIndex]);
            actor.nextMoveAt = time + 3400 + index * 620;
          }
          const residentFrame = core.tickUser(actor.id, deltaSeconds, time);
          if (residentFrame) updateActorVisual(actor, residentFrame, false);
          if (!actor.bubble && actor.ambientSpeech.length > 0 && time > actor.nextSpeechAt) {
            showSpeech(actor, actor.ambientSpeech[actor.speechIndex % actor.ambientSpeech.length]);
            actor.speechIndex += 1;
            actor.nextSpeechAt = time + 26000 + index * 1150;
          }
        });

        actors.forEach((actor) => {
          if (actor.bubble && time > actor.bubbleExpiresAt) {
            actor.node.removeChild(actor.bubble);
            actor.bubble.destroy({ children: true });
            actor.bubble = undefined;
          }
        });
        animatedObjects.forEach(({ node, sprite, baseY, mode, offset, baseRotation }) => {
          if (mode === 'glow') node.alpha = 0.92 + Math.sin(time / 460 + offset) * 0.08;
          else if (mode === 'float') sprite.y = baseY + Math.sin(time / 900 + offset) * 1.1;
          else sprite.rotation = baseRotation + Math.sin(time / 1200 + offset) * 0.0035;
        });
        ambientParticles.forEach(({ graphic, baseY, phase }) => {
          const cycle = (time / 1250 + phase) % 1;
          graphic.y = baseY - cycle * 22;
          graphic.alpha = Math.sin(cycle * Math.PI) * 0.82;
          graphic.scale.set(0.7 + cycle * 0.5);
        });
        selectionRing.alpha = 0.64 + Math.sin(time / 190) * 0.22;
        for (let index = footsteps.length - 1; index >= 0; index -= 1) {
          const step = footsteps[index];
          step.life -= delta * 0.04;
          step.graphic.alpha = Math.max(0, step.life * 0.22);
          step.graphic.scale.set(1 + (1 - step.life) * 0.35);
          if (step.life <= 0) {
            scene.removeChild(step.graphic);
            step.graphic.destroy();
            footsteps.splice(index, 1);
          }
        }
        layout();
      });
    })();

    return () => {
      disposed = true;
      runtime.current = null;
      removeEventListener('keydown', keyDown);
      removeEventListener('keyup', keyUp);
      removeWheel();
      hostElement.replaceChildren();
      app.destroy(true, { children: true });
    };
  }, [onInteract, onOpenProfile, onPresenceUpdate, room]);

  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0 touch-none" />
      <div className="absolute left-3 top-2.5 rounded-full border border-amber-100/15 bg-[#102a31]/80 px-3 py-1.5 text-[11px] font-bold text-amber-50 shadow-lg backdrop-blur-md">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,.7)]" />{room.ui.subtitle}
      </div>
      <div className="absolute right-3 top-3 z-20 flex gap-1 rounded-xl border border-white/10 bg-[#10252d]/85 p-1 shadow-lg backdrop-blur">
        <button type="button" aria-label="Zoom out" onClick={() => runtime.current?.zoomBy(-0.1)} className="h-8 w-8 rounded-lg text-lg font-black text-amber-100 hover:bg-white/10">−</button>
        <button type="button" aria-label="Recenter camera" onClick={() => runtime.current?.recenter()} className="h-8 rounded-lg px-2 text-[10px] font-black uppercase text-white/80 hover:bg-white/10">Focus</button>
        <button type="button" aria-label="Zoom in" onClick={() => runtime.current?.zoomBy(0.1)} className="h-8 w-8 rounded-lg text-lg font-black text-amber-100 hover:bg-white/10">+</button>
      </div>
      {selection ? (
        <section className="absolute bottom-20 left-3 right-3 z-20 rounded-2xl border border-amber-100/15 bg-[#10252d]/95 p-4 text-white shadow-2xl backdrop-blur-md md:left-auto md:right-4 md:w-72">
          <button type="button" aria-label="Close interaction" onClick={() => setSelection(null)} className="float-right text-slate-400 hover:text-white">×</button>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">{selection.icon} Room action</p>
          <h3 className="mt-1 text-lg font-black">{selection.title}</h3>
          <p className="mt-1 text-sm text-slate-300">{selection.description}</p>
          <button type="button" onClick={runAction} className="mt-3 w-full rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-black text-[#10252d] transition-colors hover:bg-amber-100">{selection.actionLabel}</button>
        </section>
      ) : null}
      <div className="pointer-events-none absolute bottom-20 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/10 bg-[#10252d]/72 px-4 py-2 text-[11px] font-semibold text-white/80 backdrop-blur sm:block">{room.ui.help}</div>
    </div>
  );
}
