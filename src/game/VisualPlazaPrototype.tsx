import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

interface Props { onInteract: (message: string) => void; onOpenProfile?: (username: string) => void; }
const atlasUrl = '/assets/world/prototype-plaza-atlas.png';
const characterUrl = '/assets/world/prototype-character.svg';

export function VisualPlazaPrototype({ onInteract, onOpenProfile }: Props) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const app = new PIXI.Application({ resizeTo: host.current, backgroundColor: 0x10182a, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
    host.current.appendChild(app.view as HTMLCanvasElement);
    let disposed = false;
    const keys = new Set<string>(); const down = (event: KeyboardEvent) => keys.add(event.key.toLowerCase()); const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    addEventListener('keydown', down); addEventListener('keyup', up);
    void (async () => {
      const [atlas, character] = await Promise.all([PIXI.Assets.load<PIXI.Texture>(atlasUrl), PIXI.Assets.load<PIXI.Texture>(characterUrl)]);
      if (disposed) return;
      const scene = new PIXI.Sprite(atlas); scene.anchor.set(.5); app.stage.addChild(scene);
      const actors = new PIXI.Container(); actors.sortableChildren = true; app.stage.addChild(actors);
      const label = (name: string, highlight: boolean) => new PIXI.Text(name, { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 13, fill: highlight ? 0xffed8a : 0xffffff, stroke: 0x17213d, strokeThickness: 4 });
      const makeActor = (name: string, x: number, y: number, tint: number, player = false) => { const actor = new PIXI.Container(); const sprite = new PIXI.Sprite(character); sprite.anchor.set(.5, 1); sprite.scale.set(.48); sprite.tint = tint; const nameplate = label(name, player); nameplate.anchor.set(.5); nameplate.y = -85; actor.addChild(sprite, nameplate); actor.x = x; actor.y = y; actor.zIndex = y; if (!player) { actor.eventMode = 'static'; actor.cursor = 'pointer'; actor.on('pointertap', (event) => { event.stopPropagation(); onOpenProfile?.(name); onInteract(`${name} is enjoying the prototype plaza.`); }); } actors.addChild(actor); return actor; };
      const player = makeActor('You', 500, 550, 0x8bd7ff, true); const residents = [makeActor('Alex', 350, 500, 0x6fe2c1), makeActor('Maya', 650, 505, 0xffa0bf), makeActor('Sofia', 785, 385, 0xc5a4ff)];
      const marker = new PIXI.Graphics(); marker.lineStyle(2, 0xffe48a, .9); marker.drawEllipse(0, 0, 28, 10); marker.visible = false; app.stage.addChild(marker);
      const landmarkZone = new PIXI.Graphics(); landmarkZone.beginFill(0xffffff, .001); landmarkZone.drawCircle(500, 424, 80); landmarkZone.endFill(); landmarkZone.eventMode = 'static'; landmarkZone.cursor = 'pointer'; landmarkZone.on('pointertap', (event) => { event.stopPropagation(); marker.position.set(500, 452); marker.visible = true; onInteract('The Atlas Fountain hums with a soft blue light.'); }); app.stage.addChild(landmarkZone);
      let target = new PIXI.Point(player.x, player.y); const floor = new PIXI.Graphics(); floor.beginFill(0xffffff, .001); floor.drawRect(0, 0, app.screen.width, app.screen.height); floor.endFill(); floor.eventMode = 'static'; floor.on('pointertap', (event) => { const point = event.getLocalPosition(app.stage); target = new PIXI.Point(Math.max(160, Math.min(app.screen.width - 160, point.x)), Math.max(260, Math.min(app.screen.height - 70, point.y))); marker.position.set(target.x, target.y + 2); marker.visible = true; }); app.stage.addChildAt(floor, 0);
      const layout = () => { const width = Math.min(app.screen.width * .93, 1024); scene.width = width; scene.height = width * 2 / 3; scene.position.set(app.screen.width / 2, Math.max(app.screen.height / 2 - 10, scene.height / 2 + 30)); floor.clear(); floor.beginFill(0xffffff, .001); floor.drawRect(0, 0, app.screen.width, app.screen.height); floor.endFill(); };
      app.renderer.on('resize', layout); layout();
      app.ticker.add(() => { const speed = 3.2; if (keys.has('arrowleft') || keys.has('a')) target.x -= speed; if (keys.has('arrowright') || keys.has('d')) target.x += speed; if (keys.has('arrowup') || keys.has('w')) target.y -= speed; if (keys.has('arrowdown') || keys.has('s')) target.y += speed; player.x += (target.x - player.x) * .1; player.y += (target.y - player.y) * .1; player.zIndex = player.y; residents.forEach((resident, index) => { resident.y += Math.sin(app.ticker.lastTime / 700 + index) * .08; resident.zIndex = resident.y; }); marker.alpha = .65 + Math.sin(app.ticker.lastTime / 180) * .25; });
    })();
    return () => { disposed = true; removeEventListener('keydown', down); removeEventListener('keyup', up); app.destroy(true, { children: true }); };
  }, [onInteract, onOpenProfile]);
  return <div className="relative h-full w-full"><div ref={host} className="absolute inset-0"/><div className="absolute left-4 top-4 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-bold tracking-wide text-cyan-200 backdrop-blur">DEV · Visual prototype</div><div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/75 px-4 py-2 text-xs text-white/85 backdrop-blur pointer-events-none">Asset-rendered scene · click to move · tap fountain or residents</div></div>;
}
