import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { intersects, isoToScreen, IsoPoint, screenToIso, TILE_HEIGHT, TILE_WIDTH } from './isometric';
import { worldAssets, WorldAssetKey, worldObjects } from './worldManifest';

interface Props { onInteract: (message: string) => void; onOpenProfile?: (username: string) => void; }
interface Actor { node: PIXI.Container; position: IsoPoint; target: IsoPoint; }
const WORLD_LIMIT = 5.2;

export function VisualPlazaPrototype({ onInteract, onOpenProfile }: Props) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const app = new PIXI.Application({ resizeTo: host.current, backgroundColor: 0x132138, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
    host.current.appendChild(app.view as HTMLCanvasElement);
    const scene = new PIXI.Container(); scene.sortableChildren = true; app.stage.addChild(scene);
    const keys = new Set<string>(); let disposed = false;
    const keyDown = (event: KeyboardEvent) => keys.add(event.key.toLowerCase()); const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase()); addEventListener('keydown', keyDown); addEventListener('keyup', keyUp);

    void (async () => {
      const entries = await Promise.all(Object.entries(worldAssets).map(async ([key, url]) => [key, await PIXI.Assets.load<PIXI.Texture>(url)] as const));
      if (disposed) return;
      const textures = Object.fromEntries(entries) as Record<WorldAssetKey, PIXI.Texture>;

      for (let x = -6; x <= 6; x += 1) for (let y = -5; y <= 5; y += 1) {
        const tile = new PIXI.Sprite(textures.ground); const screen = isoToScreen({ x, y }); tile.anchor.set(.5); tile.width = TILE_WIDTH + 1; tile.height = TILE_HEIGHT + 1; tile.position.set(screen.x, screen.y); tile.zIndex = -10000 + screen.y; scene.addChild(tile);
      }

      const selection = new PIXI.Graphics(); selection.lineStyle(3, 0xffe38a, .95); selection.drawEllipse(0, 0, 29, 11); selection.visible = false; selection.zIndex = 99999; scene.addChild(selection);
      worldObjects.forEach((definition) => {
        const sprite = new PIXI.Sprite(textures[definition.asset]); const screen = isoToScreen(definition.position); sprite.anchor.set(.5, 1); sprite.width = definition.displayWidth; sprite.scale.y = sprite.scale.x; sprite.position.set(screen.x, screen.y); sprite.zIndex = screen.y + (definition.depthBias ?? 0); sprite.name = definition.id;
        if (definition.interaction) { sprite.eventMode = 'static'; sprite.cursor = 'pointer'; sprite.on('pointertap', (event) => { event.stopPropagation(); selection.position.set(screen.x, screen.y + 2); selection.visible = true; onInteract(definition.interaction!); }); }
        scene.addChild(sprite);
      });

      const makeActor = (name: string, position: IsoPoint, tint: number, isPlayer = false): Actor => {
        const node = new PIXI.Container(); const sprite = new PIXI.Sprite(textures.character); sprite.anchor.set(.5, 1); sprite.width = 54; sprite.scale.y = sprite.scale.x; sprite.tint = tint; const nameplate = new PIXI.Text(name, { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 13, fill: isPlayer ? 0xffe38a : 0xffffff, stroke: 0x14213a, strokeThickness: 4 }); nameplate.anchor.set(.5); nameplate.y = -76; node.addChild(sprite, nameplate); if (!isPlayer) { node.eventMode = 'static'; node.cursor = 'pointer'; node.on('pointertap', (event) => { event.stopPropagation(); onOpenProfile?.(name); onInteract(`${name} waves from the plaza.`); }); } scene.addChild(node); return { node, position: { ...position }, target: { ...position } };
      };
      const player = makeActor('You', { x: 1.2, y: 4.25 }, 0x8bd7ff, true);
      const residents = [makeActor('Alex', { x: -1.8, y: 1.6 }, 0x72e0c2), makeActor('Maya', { x: 2.15, y: 2.1 }, 0xff9dbc), makeActor('Sofia', { x: 1.5, y: -1 }, 0xc5a3ff)];
      const placeActor = (actor: Actor) => { const screen = isoToScreen(actor.position); actor.node.position.set(screen.x, screen.y); actor.node.zIndex = screen.y + 1; };
      placeActor(player); residents.forEach(placeActor);

      const blocked = (point: IsoPoint) => Math.abs(point.x) > WORLD_LIMIT || Math.abs(point.y) > WORLD_LIMIT || worldObjects.some((object) => object.collision && intersects(point, object.collision));
      scene.eventMode = 'static'; scene.hitArea = new PIXI.Rectangle(-900, -420, 1800, 950); scene.on('pointertap', (event) => { const local = event.getLocalPosition(scene); const target = screenToIso(local); if (!blocked(target)) { player.target = target; const marker = isoToScreen(target); selection.position.set(marker.x, marker.y + 2); selection.visible = true; } else onInteract('That part of the plaza is not walkable.'); });

      const layout = () => { const scale = Math.min(app.screen.width / 1120, app.screen.height / 720, 1); scene.scale.set(scale); scene.position.set(app.screen.width / 2, Math.max(215 * scale, app.screen.height * .42)); };
      app.renderer.on('resize', layout); layout();
      app.ticker.add((delta) => {
        const keyboardStep = .055 * delta; let dx = 0; let dy = 0;
        if (keys.has('w') || keys.has('arrowup')) { dx -= keyboardStep; dy -= keyboardStep; }
        if (keys.has('s') || keys.has('arrowdown')) { dx += keyboardStep; dy += keyboardStep; }
        if (keys.has('a') || keys.has('arrowleft')) { dx -= keyboardStep; dy += keyboardStep; }
        if (keys.has('d') || keys.has('arrowright')) { dx += keyboardStep; dy -= keyboardStep; }
        if (dx || dy) player.target = { x: player.position.x + dx, y: player.position.y + dy };
        const distance = Math.hypot(player.target.x - player.position.x, player.target.y - player.position.y);
        if (distance > .025) { const step = Math.min(.075 * delta, distance); const candidate = { x: player.position.x + (player.target.x - player.position.x) / distance * step, y: player.position.y + (player.target.y - player.position.y) / distance * step }; if (blocked(candidate)) player.target = { ...player.position }; else player.position = candidate; }
        placeActor(player); residents.forEach(placeActor); selection.alpha = .62 + Math.sin(app.ticker.lastTime / 170) * .25;
      });
    })();

    return () => { disposed = true; removeEventListener('keydown', keyDown); removeEventListener('keyup', keyUp); app.destroy(true, { children: true }); };
  }, [onInteract, onOpenProfile]);
  return <div className="relative h-full w-full"><div ref={host} className="absolute inset-0 touch-none"/><div className="absolute left-4 top-4 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-bold tracking-wide text-cyan-200 backdrop-blur">DEV · Modular isometric world</div><div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/75 px-4 py-2 text-xs text-white/85 backdrop-blur pointer-events-none">Click to move · WASD / arrows · interact with cafe, market, fountain, or residents</div></div>;
}
