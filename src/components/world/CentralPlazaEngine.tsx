import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { AvatarService } from '../../services/AvatarService';
import type { AvatarState } from '../../services/AvatarService';
import { VisualPlazaPrototype } from '../../game/VisualPlazaPrototype';
import type { RoomEditorController } from '../../game/IsometricRoomEngine';
import type { PlayerSpeech, RoomDefinition } from '../../game/roomEngine';

interface Props { roomType?: string; onInteract: (message: string) => void; onEnterRoom?: (roomId: string) => void; onOpenProfile?: (username: string) => void; onPresenceUpdate?: (count: number) => void; playerSpeech?: PlayerSpeech | null; roomOverride?: RoomDefinition; editor?: RoomEditorController; }
const palette = { ink: 0x17213d, mint: 0x7ae7c7, cyan: 0x70d6ff, pink: 0xff70a6, gold: 0xffd166, cream: 0xfff5df, grass: 0x62c98d, brick: 0x664e9b };

function label(text: string, size = 13, color = 0xffffff) { const t = new PIXI.Text(text, { fontFamily: 'Arial', fontSize: size, fontWeight: 'bold', fill: color, dropShadow: true, dropShadowColor: 0x17213d, dropShadowDistance: 2 }); t.anchor.set(.5); return t; }
function ellipse(g: PIXI.Graphics, x: number, y: number, rx: number, ry: number, color: number) { g.beginFill(color); g.drawEllipse(x, y, rx, ry); g.endFill(); }
function avatar(state: AvatarState, name: string) {
  const c = new PIXI.Container(); const g = new PIXI.Graphics();
  ellipse(g, 0, 19, 17, 6, 0x16203b); g.beginFill(state.outfitColor); g.drawRoundedRect(-13, 0, 26, 31, 8); g.endFill();
  g.beginFill(state.baseColor); g.drawCircle(0, -8, 14); g.endFill(); g.beginFill(state.hairColor); g.drawCircle(0, -12, 15); g.drawRect(-15, -12, 30, 10); g.endFill();
  g.beginFill(state.accessoryColor); g.drawCircle(11, 1, 4); g.endFill(); c.addChild(g); const n = label(name); n.y = -33; c.addChild(n); return c;
}
function interactive(container: PIXI.Container, onClick: () => void) { container.eventMode = 'static'; container.cursor = 'pointer'; container.on('pointertap', (e) => { e.stopPropagation(); onClick(); }); container.on('pointerover', () => { container.scale.set(1.06); }); container.on('pointerout', () => { container.scale.set(1); }); }

export function CentralPlazaEngine(props: Props) {
  if (props.roomType === 'plaza') return <VisualPlazaPrototype onInteract={props.onInteract} onEnterRoom={props.onEnterRoom} onOpenProfile={props.onOpenProfile} onPresenceUpdate={props.onPresenceUpdate} playerSpeech={props.playerSpeech} roomOverride={props.roomOverride} editor={props.editor}/>;
  return <PrimitiveCentralPlazaEngine {...props}/>;
}

function PrimitiveCentralPlazaEngine({ roomType = 'plaza', onInteract, onOpenProfile, onPresenceUpdate }: Props) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const app = new PIXI.Application({ resizeTo: host.current, backgroundColor: palette.ink, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true }); host.current.appendChild(app.view as HTMLCanvasElement);
    const world = new PIXI.Container(); app.stage.addChild(world); const floor = new PIXI.Graphics(); world.addChild(floor);
    const drawFloor = () => { floor.clear(); floor.beginFill(roomType === 'cafe' ? 0x533b45 : roomType === 'gallery' ? 0x303d5e : 0x355d6e); floor.drawRoundedRect(-550, -390, 1100, 780, 48); floor.endFill(); floor.lineStyle(2, 0xffffff, .08); for (let x = -500; x < 550; x += 70) { floor.moveTo(x, -350); floor.lineTo(x, 350); } for (let y = -350; y < 360; y += 70) { floor.moveTo(-510, y); floor.lineTo(510, y); } };
    drawFloor();
    const addSign = (x: number, y: number, title: string, color: number, msg: string) => { const c = new PIXI.Container(); const g = new PIXI.Graphics(); g.beginFill(color); g.drawRoundedRect(-78, -28, 156, 56, 16); g.endFill(); g.lineStyle(2, 0xffffff, .25); g.drawRoundedRect(-78, -28, 156, 56, 16); c.addChild(g); const t = label(title, 15); c.addChild(t); c.x = x; c.y = y; interactive(c, () => onInteract(msg)); world.addChild(c); };
    const plant = (x: number, y: number) => { const g = new PIXI.Graphics(); g.beginFill(0x3d8c78); g.drawCircle(x, y, 28); g.endFill(); g.beginFill(palette.grass); g.drawCircle(x - 12, y - 15, 18); g.drawCircle(x + 15, y - 12, 20); g.endFill(); world.addChild(g); };
    const building = (x: number, y: number, w: number, h: number, color: number, title: string) => { const c = new PIXI.Container(); const g = new PIXI.Graphics(); g.beginFill(color); g.drawRoundedRect(-w / 2, -h / 2, w, h, 18); g.endFill(); g.beginFill(0xffffff, .18); for (let i = -w / 2 + 20; i < w / 2; i += 38) g.drawRoundedRect(i, -h / 2 + 18, 20, 24, 5); c.addChild(g); const t = label(title, 15, palette.cream); t.y = -h / 2 - 17; c.addChild(t); c.x = x; c.y = y; world.addChild(c); };
    if (roomType === 'cafe') { building(0, -205, 500, 130, 0x9b5264, "LUNA'S CAFE"); addSign(0, -165, 'ORDER COFFEE', palette.gold, 'Fresh digital espresso, on the house.'); [-180, 0, 180].forEach((x) => { const g = new PIXI.Graphics(); g.beginFill(0x7a4a4a); g.drawCircle(x, 40, 42); g.endFill(); g.beginFill(palette.cream); g.drawCircle(x, 35, 15); g.endFill(); world.addChild(g); }); addSign(0, 210, 'PLAZA EXIT', palette.cyan, 'Head back to Central Plaza with the room switcher.'); }
    else if (roomType === 'gallery') { building(0, -205, 540, 125, 0x4c5f9f, 'HUMAN GALLERY'); [-200, 0, 200].forEach((x, i) => { const c = new PIXI.Container(); const g = new PIXI.Graphics(); g.beginFill(0xf7f3ea); g.drawRoundedRect(-55, -65, 110, 130, 8); g.endFill(); g.beginFill([palette.pink, palette.cyan, palette.gold][i]); g.drawCircle(0, 0, 34); g.endFill(); c.addChild(g); c.x = x; c.y = 25; interactive(c, () => onInteract(`Exhibit ${i + 1}: a small story from a big human world.`)); world.addChild(c); }); addSign(0, 210, 'LEAVE A GLOW', palette.pink, 'You left a little glow for the artists.'); }
    else { building(-310, -205, 240, 130, 0x6c579e, "MAYA'S STUDIO"); building(310, -205, 240, 130, 0x487b8e, "LUNA'S CAFE"); plant(-435, 135); plant(435, 135); const fountain = new PIXI.Graphics(); ellipse(fountain, 0, 20, 95, 50, 0x315d90); ellipse(fountain, 0, 8, 70, 32, palette.cyan); fountain.beginFill(0xffffff, .55); fountain.drawCircle(0, -22, 13); fountain.endFill(); world.addChild(fountain); addSign(0, 130, 'WISH FOUNTAIN', palette.pink, 'Your wish ripples across the plaza.'); addSign(-315, 100, 'COMMUNITY BOARD', palette.gold, 'Tonight: open mic at Luna’s Cafe.'); addSign(315, 100, 'CAFE DOOR', palette.cyan, 'Luna is pouring something warm.'); }
    const player = avatar(AvatarService.getAvatar('dev-user-1'), 'You'); player.x = 0; player.y = 170; world.addChild(player);
    const residents = [{ name: 'Alex', x: -145, y: 120, state: { baseColor: 0xc88161, hairColor: 0x1c253b, outfitColor: 0x4ecdc4, accessoryColor: 0xffd166, hair: 'short' as const } }, { name: 'Maya', x: 145, y: 155, state: { baseColor: 0x8c543b, hairColor: 0x332549, outfitColor: 0xff70a6, accessoryColor: 0x70d6ff, hair: 'wave' as const } }, { name: 'Leo', x: -230, y: -5, state: { baseColor: 0xe2ad82, hairColor: 0x54362b, outfitColor: 0xff9f43, accessoryColor: 0xffffff, hair: 'buzz' as const } }, { name: 'Sofia', x: 230, y: -5, state: { baseColor: 0xf2c3a8, hairColor: 0x26356e, outfitColor: 0x8b5cf6, accessoryColor: 0xffd166, hair: 'wave' as const } }];
    residents.forEach((r) => { const a = avatar(r.state, r.name); a.x = r.x; a.y = r.y; interactive(a, () => onOpenProfile?.(r.name)); world.addChild(a); }); onPresenceUpdate?.(residents.length + 1);
    let target = { x: player.x, y: player.y }; floor.eventMode = 'static'; floor.on('pointertap', (e) => { const p = e.getLocalPosition(world); target = { x: Math.max(-475, Math.min(475, p.x)), y: Math.max(-315, Math.min(315, p.y)) }; });
    const keys = new Set<string>();
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      keys.add(key);
    };
    const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const clearKeys = () => keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearKeys);
    const resize = () => { world.x = app.screen.width / 2; world.y = app.screen.height / 2 + 18; const s = Math.min(app.screen.width / 1000, app.screen.height / 700, 1); world.scale.set(s); }; app.renderer.on('resize', resize); resize();
    app.ticker.add(() => { const speed = 3.6; if (keys.has('arrowleft') || keys.has('a')) target.x -= speed; if (keys.has('arrowright') || keys.has('d')) target.x += speed; if (keys.has('arrowup') || keys.has('w')) target.y -= speed; if (keys.has('arrowdown') || keys.has('s')) target.y += speed; target.x = Math.max(-475, Math.min(475, target.x)); target.y = Math.max(-315, Math.min(315, target.y)); player.x += (target.x - player.x) * .12; player.y += (target.y - player.y) * .12; });
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearKeys);
      app.renderer.off('resize', resize);
      app.destroy(true, { children: true });
    };
  }, [roomType, onInteract, onOpenProfile, onPresenceUpdate]);
  return <div className="relative h-full w-full"><div ref={host} className="absolute inset-0 touch-none"/><div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full bg-slate-950/70 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur sm:block">Click to walk · Arrow keys / WASD · Tap residents and glowing objects</div></div>;
}
