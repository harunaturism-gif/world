import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { intersects, isoToScreen, type IsoPoint, screenToIso, TILE_HEIGHT, TILE_WIDTH } from './isometric';
import type { RoomDefinition, RoomSelection } from './roomEngine';

interface Props {
  room: RoomDefinition;
  onInteract: (message: string) => void;
  onEnterRoom?: (roomId: string) => void;
  onOpenProfile?: (username: string) => void;
  onPresenceUpdate?: (count: number) => void;
}
interface Actor { node: PIXI.Container; sprite: PIXI.Sprite; baseScale: number; position: IsoPoint; target: IsoPoint; }
interface AnimatedObject { node: PIXI.Container; sprite: PIXI.Sprite; baseScale: number; mode: 'glow' | 'float'; offset: number; }

export function IsometricRoomEngine({ room, onInteract, onEnterRoom, onOpenProfile, onPresenceUpdate }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<RoomSelection | null>(null);

  const runAction = () => {
    if (!selection) return;
    if (selection.action === 'enter-room' && selection.targetId) { onInteract(`Entering ${selection.title}…`); window.setTimeout(() => onEnterRoom?.(selection.targetId!), 260); }
    else if (selection.action === 'view-profile' && selection.targetId) onOpenProfile?.(selection.targetId);
    else onInteract(`${selection.actionLabel}: ${selection.title}`);
  };

  useEffect(() => {
    if (!host.current) return;
    const app = new PIXI.Application({ resizeTo: host.current, backgroundColor: 0x132138, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
    host.current.appendChild(app.view as HTMLCanvasElement);
    const scene = new PIXI.Container(); scene.sortableChildren = true; app.stage.addChild(scene);
    const keys = new Set<string>(); let disposed = false;
    const keyDown = (event: KeyboardEvent) => keys.add(event.key.toLowerCase()); const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase()); addEventListener('keydown', keyDown); addEventListener('keyup', keyUp);

    void (async () => {
      const urls = Array.from(new Set([room.floor.asset, room.floor.boundaryAsset, '/assets/world/characters/prototype-character.svg', ...room.objects.map((object) => object.asset)]));
      const textures = new Map<string, PIXI.Texture>(await Promise.all(urls.map(async (url) => [url, await PIXI.Assets.load<PIXI.Texture>(url)] as const)));
      if (disposed) return;
      onPresenceUpdate?.(room.avatars.length);

      for (let x = room.floor.minX; x <= room.floor.maxX; x += 1) for (let y = room.floor.minY; y <= room.floor.maxY; y += 1) {
        const edge = x === room.floor.minX || x === room.floor.maxX || y === room.floor.minY || y === room.floor.maxY;
        const tile = new PIXI.Sprite(textures.get(edge ? room.floor.boundaryAsset : room.floor.asset)); const screen = isoToScreen({ x, y }); tile.anchor.set(.5); tile.width = TILE_WIDTH + 1; tile.height = TILE_HEIGHT + 1; tile.position.set(screen.x, screen.y); tile.zIndex = -10000 + screen.y; scene.addChild(tile);
      }

      const selectionRing = new PIXI.Graphics(); selectionRing.lineStyle(3, 0xffe38a, .95); selectionRing.drawEllipse(0, 0, 29, 11); selectionRing.visible = false; selectionRing.zIndex = 99999; scene.addChild(selectionRing);
      const animatedObjects: AnimatedObject[] = [];
      room.objects.forEach((definition, index) => {
        const node = new PIXI.Container(); const sprite = new PIXI.Sprite(textures.get(definition.asset)); const screen = isoToScreen(definition.position); sprite.anchor.set(.5, 1); sprite.width = definition.displayWidth; sprite.scale.y = sprite.scale.x; node.addChild(sprite); node.position.set(screen.x, screen.y); node.zIndex = screen.y + (definition.depthBias ?? 0); node.name = definition.id;
        if (definition.interaction) { const icon = new PIXI.Text(definition.interaction.icon ?? '✦', { fontFamily: 'Arial', fontSize: 15, fontWeight: 'bold', fill: 0xffe38a, stroke: 0x14213a, strokeThickness: 4 }); icon.anchor.set(.5); icon.y = -sprite.height - 10; node.addChild(icon); sprite.eventMode = 'static'; sprite.cursor = 'pointer'; sprite.on('pointerover', () => { sprite.scale.set(sprite.scale.x * 1.035); icon.alpha = 1; }); sprite.on('pointerout', () => { sprite.scale.set(definition.displayWidth / sprite.texture.width); icon.alpha = .82; }); sprite.on('pointertap', (event) => { event.stopPropagation(); selectionRing.position.set(screen.x, screen.y + 2); selectionRing.visible = true; setSelection({ ...definition.interaction!, sourceId: definition.id }); onInteract(definition.interaction!.description); }); }
        if (definition.ambient) animatedObjects.push({ node, sprite, baseScale: sprite.scale.x, mode: definition.ambient, offset: index });
        scene.addChild(node);
      });

      const makeActor = (name: string, position: IsoPoint, tint: number, isPlayer = false): Actor => {
        const node = new PIXI.Container(); const sprite = new PIXI.Sprite(textures.get('/assets/world/characters/prototype-character.svg')); sprite.anchor.set(.5, 1); sprite.width = 62; sprite.scale.y = sprite.scale.x; sprite.tint = tint; const baseScale = sprite.scale.x;
        const nameplate = new PIXI.Text(name, { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 13, fill: isPlayer ? 0xffe38a : 0xffffff, stroke: 0x14213a, strokeThickness: 4 }); nameplate.anchor.set(.5); nameplate.y = -84; node.addChild(sprite, nameplate);
        if (!isPlayer) { const icon = new PIXI.Text('●', { fontFamily: 'Arial', fontSize: 10, fill: 0x76e8c8, stroke: 0x14213a, strokeThickness: 3 }); icon.anchor.set(.5); icon.y = -101; node.addChild(icon); sprite.eventMode = 'static'; sprite.cursor = 'pointer'; sprite.on('pointerover', () => node.scale.set(1.05)); sprite.on('pointerout', () => node.scale.set(1)); sprite.on('pointertap', (event) => { event.stopPropagation(); selectionRing.position.copyFrom(node.position); selectionRing.visible = true; setSelection({ sourceId: name, title: name, description: `${name} is spending time in ${room.name}.`, actionLabel: 'View Profile', action: 'view-profile', targetId: name, icon: '●' }); onInteract(`${name} waves hello.`); }); }
        scene.addChild(node); return { node, sprite, baseScale, position: { ...position }, target: { ...position } };
      };
      const actors = room.avatars.map((avatar) => makeActor(avatar.name, avatar.player ? room.spawn : avatar.position, avatar.tint, avatar.player)); const player = actors.find((_, index) => room.avatars[index].player) ?? actors[0]; const residents = actors.filter((actor) => actor !== player);
      const placeActor = (actor: Actor) => { const screen = isoToScreen(actor.position); actor.node.position.set(screen.x, screen.y); actor.node.zIndex = screen.y + 1; };
      actors.forEach(placeActor);

      const blocked = (point: IsoPoint) => point.x < room.floor.minX + .35 || point.x > room.floor.maxX - .35 || point.y < room.floor.minY + .35 || point.y > room.floor.maxY - .35 || room.objects.some((object) => object.collision && intersects(point, object.collision));
      scene.eventMode = 'static'; scene.hitArea = new PIXI.Rectangle(-950, -460, 1900, 980); scene.on('pointertap', (event) => { const target = screenToIso(event.getLocalPosition(scene)); if (!blocked(target)) { player.target = target; const marker = isoToScreen(target); selectionRing.position.set(marker.x, marker.y + 2); selectionRing.visible = true; setSelection(null); } else onInteract('That space is occupied. Choose another tile.'); });

      const layout = () => { const compact = app.screen.width < 640; const scale = compact ? Math.min(app.screen.width / 760, app.screen.height / 560, .72) : Math.min(app.screen.width / 1120, app.screen.height / 680, 1); scene.scale.set(scale); scene.position.set(app.screen.width / 2, compact ? app.screen.height * .36 : Math.max(195 * scale, app.screen.height * .4)); };
      app.renderer.on('resize', layout); layout();
      app.ticker.add((delta) => {
        const keyboardStep = .05 * delta; let dx = 0; let dy = 0;
        if (keys.has('w') || keys.has('arrowup')) { dx -= keyboardStep; dy -= keyboardStep; } if (keys.has('s') || keys.has('arrowdown')) { dx += keyboardStep; dy += keyboardStep; } if (keys.has('a') || keys.has('arrowleft')) { dx -= keyboardStep; dy += keyboardStep; } if (keys.has('d') || keys.has('arrowright')) { dx += keyboardStep; dy -= keyboardStep; }
        if (dx || dy) player.target = { x: player.position.x + dx, y: player.position.y + dy };
        const distance = Math.hypot(player.target.x - player.position.x, player.target.y - player.position.y); let moving = false;
        if (distance > .025) { const step = Math.min(.07 * delta, distance); const full = { x: player.position.x + (player.target.x - player.position.x) / distance * step, y: player.position.y + (player.target.y - player.position.y) / distance * step }; const slideX = { x: full.x, y: player.position.y }; const slideY = { x: player.position.x, y: full.y }; if (!blocked(full)) { player.position = full; moving = true; } else if (!blocked(slideX)) { player.position = slideX; moving = true; } else if (!blocked(slideY)) { player.position = slideY; moving = true; } else player.target = { ...player.position }; }
        placeActor(player); residents.forEach(placeActor); const time = app.ticker.lastTime; player.sprite.y = moving ? Math.sin(time / 70) * 2 : Math.sin(time / 520) * .8; player.sprite.scale.set(player.baseScale * (moving ? 1 + Math.sin(time / 70) * .025 : 1)); residents.forEach((actor, index) => { actor.sprite.y = Math.sin(time / 520 + index) * .8; }); animatedObjects.forEach(({ node, sprite, baseScale, mode, offset }) => { if (mode === 'glow') node.alpha = .9 + Math.sin(time / 420 + offset) * .1; else sprite.scale.set(baseScale * (1 + Math.sin(time / 850 + offset) * .008)); }); selectionRing.alpha = .62 + Math.sin(time / 170) * .25;
      });
    })();

    return () => { disposed = true; removeEventListener('keydown', keyDown); removeEventListener('keyup', keyUp); app.destroy(true, { children: true }); };
  }, [onInteract, onOpenProfile, onPresenceUpdate, room]);

  return <div className="relative h-full w-full"><div ref={host} className="absolute inset-0 touch-none"/><div className="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-xs font-bold text-cyan-100 backdrop-blur"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400"/>{room.ui.subtitle}</div>{selection && <section className="absolute bottom-24 left-3 right-3 z-20 rounded-2xl border border-white/15 bg-[#111a30]/95 p-4 text-white shadow-2xl backdrop-blur md:left-auto md:right-4 md:w-72"><button aria-label="Close interaction" onClick={() => setSelection(null)} className="float-right text-slate-400 hover:text-white">×</button><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">{selection.icon} Interaction</p><h3 className="mt-1 text-lg font-black">{selection.title}</h3><p className="mt-1 text-sm text-slate-300">{selection.description}</p><button onClick={runAction} className="mt-3 w-full rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-200">{selection.actionLabel}</button></section>}<div className="pointer-events-none absolute bottom-24 left-1/2 hidden -translate-x-1/2 rounded-full bg-slate-950/75 px-4 py-2 text-xs text-white/85 backdrop-blur sm:block">{room.ui.help}</div></div>;
}
