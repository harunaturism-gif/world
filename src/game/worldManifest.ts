import type { RoomDefinition } from './roomEngine';

export const worldAssets = {
  ground: '/assets/world/ground/plaza-stone-a.svg',
  groundVariant: '/assets/world/ground/plaza-stone-b.svg',
  path: '/assets/world/ground/plaza-path.svg',
  curb: '/assets/world/ground/curb-natural.svg',
  cafe: '/assets/world/buildings/cafe.png',
  stall: '/assets/world/props/market-stall.png',
  tree: '/assets/world/vegetation/tree.png',
  fountain: '/assets/world/props/fountain.png',
  bench: '/assets/world/props/bench.png',
  lamp: '/assets/world/props/lamp.png',
  planter: '/assets/world/vegetation/planter.png',
  sign: '/assets/world/props/sign.png',
  table: '/assets/world/props/table.svg',
  chair: '/assets/world/props/chair.svg',
  avatarShadow: '/assets/world/characters/avatar-shadow.svg',
  avatarAtlas: '/assets/world/characters/human-world-avatar-atlas.png',
} as const;

const socialAvatar = {
  frameColumns: 4,
  frameRows: 4,
  renderWidth: 116,
  layers: [{ slot: 'body' as const, asset: worldAssets.avatarAtlas }],
};

export const centralPlazaRoom: RoomDefinition = {
  id: 'central-plaza',
  name: 'Central Plaza',
  floor: { assets: [worldAssets.ground, worldAssets.groundVariant], pathAssets: [worldAssets.path], boundaryAsset: worldAssets.curb, minX: -6, maxX: 6, minY: -5, maxY: 5 },
  spawn: { x: 1.2, y: 4.25 },
  ui: { subtitle: 'Social district · 3 residents online', help: 'Click to move · WASD / arrows · tap glowing objects or residents' },
  objects: [
    { id: 'cafe', asset: worldAssets.cafe, category: 'building', position: { x: -2.7, y: 3 }, displayWidth: 235, collision: { kind: 'rect', x: -2.7, y: 3, width: 2.8, height: 1.9 }, interactionPoint: { x: -1.05, y: 1.75 }, interaction: { title: "Luna's Cafe", description: 'A warm social space serving the plaza.', actionLabel: 'Enter Cafe', action: 'enter-room', targetId: 'lunas-cafe', icon: '☕' } },
    { id: 'market', asset: worldAssets.stall, category: 'building', position: { x: 2.7, y: -2.5 }, displayWidth: 225, collision: { kind: 'rect', x: 2.7, y: -2.5, width: 2.2, height: 1.5 }, interactionPoint: { x: 1.25, y: -1.35 }, interaction: { title: 'Fresh Market', description: 'Colorful local goods from demo residents.', actionLabel: 'Visit Market', action: 'inspect', icon: '✦' } },
    { id: 'tree', asset: worldAssets.tree, category: 'vegetation', position: { x: 3.8, y: .8 }, displayWidth: 275, collision: { kind: 'circle', x: 3.8, y: .8, radius: .72 }, ambient: 'float' },
    { id: 'fountain', asset: worldAssets.fountain, category: 'landmark', position: { x: 0, y: -.1 }, displayWidth: 245, collision: { kind: 'circle', x: 0, y: -.1, radius: 1.25 }, interactionPoint: { x: .1, y: 1.45 }, interaction: { title: 'Atlas Fountain', description: 'The heart of Central Plaza hums with blue light.', actionLabel: 'Drink Water', action: 'use', icon: '◆' }, ambient: 'glow' },
    { id: 'bench-west', asset: worldAssets.bench, category: 'furniture', position: { x: -3.7, y: -.4 }, displayWidth: 165, collision: { kind: 'rect', x: -3.7, y: -.4, width: 1.8, height: .65 }, interactionPoint: { x: -2.65, y: .35 }, interaction: { title: 'Garden Bench', description: 'A peaceful place to watch the plaza.', actionLabel: 'Sit', action: 'sit', icon: '•' } },
    { id: 'bench-south', asset: worldAssets.bench, category: 'furniture', position: { x: .1, y: 4.6 }, displayWidth: 145, collision: { kind: 'rect', x: .1, y: 4.6, width: 1.65, height: .6 }, interactionPoint: { x: 1.15, y: 3.75 }, interaction: { title: 'Plaza Bench', description: 'Take a break near the main walkway.', actionLabel: 'Sit', action: 'sit', icon: '•' } },
    { id: 'lamp-east', asset: worldAssets.lamp, category: 'prop', position: { x: 3.6, y: 3 }, displayWidth: 92, collision: { kind: 'circle', x: 3.6, y: 3, radius: .35 }, ambient: 'glow' },
    { id: 'lamp-west', asset: worldAssets.lamp, category: 'prop', position: { x: -1.4, y: -3.4 }, displayWidth: 82, collision: { kind: 'circle', x: -1.4, y: -3.4, radius: .32 }, ambient: 'glow' },
    { id: 'planter', asset: worldAssets.planter, category: 'vegetation', position: { x: -4.2, y: .6 }, displayWidth: 95, collision: { kind: 'circle', x: -4.2, y: .6, radius: .48 } },
    { id: 'sign', asset: worldAssets.sign, category: 'prop', position: { x: -1.25, y: -2.2 }, displayWidth: 58, collision: { kind: 'circle', x: -1.25, y: -2.2, radius: .28 }, depthBias: 2 },
    { id: 'cafe-table', asset: worldAssets.table, category: 'furniture', position: { x: -1.4, y: 1 }, displayWidth: 88, collision: { kind: 'circle', x: -1.4, y: 1, radius: .55 } },
    { id: 'cafe-chair', asset: worldAssets.chair, category: 'furniture', position: { x: -.65, y: 1.35 }, displayWidth: 48, collision: { kind: 'circle', x: -.65, y: 1.35, radius: .3 } },
  ],
  avatars: [
    { id: 'player', name: 'You', position: { x: 1.2, y: 4.25 }, palette: { skin: 0xf2b78d, hair: 0x273250, outfit: 0x4c83d8, accessory: 0xffd166 }, appearance: socialAvatar, player: true },
    { id: 'alex', name: 'Alex', position: { x: -1.8, y: 1.6 }, palette: { skin: 0xc9825b, hair: 0x38261f, outfit: 0x43b995, accessory: 0xffc857 }, appearance: socialAvatar, patrol: [{ x: -1.8, y: 1.6 }, { x: -2.45, y: 1.05 }] },
    { id: 'maya', name: 'Maya', position: { x: 2.15, y: 2.1 }, palette: { skin: 0xdda179, hair: 0x612b3d, outfit: 0xe9658b, accessory: 0x76e8c8 }, appearance: socialAvatar, patrol: [{ x: 2.15, y: 2.1 }, { x: 2.65, y: 2.7 }] },
    { id: 'sofia', name: 'Sofia', position: { x: 1.5, y: -1 }, palette: { skin: 0xf0bd93, hair: 0x2f244a, outfit: 0x8f76d6, accessory: 0xffd166 }, appearance: socialAvatar, patrol: [{ x: 1.5, y: -1 }, { x: 1.85, y: -.55 }] },
  ],
};
