import type { RoomDefinition } from './roomEngine';

export const worldAssets = {
  ground: '/assets/world/ground/plaza-tile.svg',
  curb: '/assets/world/ground/curb-edge.svg',
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
  character: '/assets/world/characters/prototype-character.svg',
} as const;

export const centralPlazaRoom: RoomDefinition = {
  id: 'central-plaza',
  name: 'Central Plaza',
  floor: { asset: worldAssets.ground, boundaryAsset: worldAssets.curb, minX: -6, maxX: 6, minY: -5, maxY: 5 },
  spawn: { x: 1.2, y: 4.25 },
  ui: { subtitle: 'Social district · 3 residents online', help: 'Click to move · WASD / arrows · tap glowing objects or residents' },
  objects: [
    { id: 'cafe', asset: worldAssets.cafe, category: 'building', position: { x: -2.7, y: 3 }, displayWidth: 235, collision: { kind: 'rect', x: -2.7, y: 3, width: 2.8, height: 1.9 }, interaction: { title: "Luna's Cafe", description: 'A warm social space serving the plaza.', actionLabel: 'Enter Cafe', action: 'enter-room', targetId: 'lunas-cafe', icon: '☕' } },
    { id: 'market', asset: worldAssets.stall, category: 'building', position: { x: 2.7, y: -2.5 }, displayWidth: 225, collision: { kind: 'rect', x: 2.7, y: -2.5, width: 2.2, height: 1.5 }, interaction: { title: 'Fresh Market', description: 'Colorful local goods from demo residents.', actionLabel: 'Visit Market', action: 'inspect', icon: '✦' } },
    { id: 'tree', asset: worldAssets.tree, category: 'vegetation', position: { x: 3.8, y: .8 }, displayWidth: 275, collision: { kind: 'circle', x: 3.8, y: .8, radius: .72 }, ambient: 'float' },
    { id: 'fountain', asset: worldAssets.fountain, category: 'landmark', position: { x: 0, y: -.1 }, displayWidth: 245, collision: { kind: 'circle', x: 0, y: -.1, radius: 1.25 }, interaction: { title: 'Atlas Fountain', description: 'The heart of Central Plaza hums with blue light.', actionLabel: 'Drink Water', action: 'use', icon: '◆' }, ambient: 'glow' },
    { id: 'bench-west', asset: worldAssets.bench, category: 'furniture', position: { x: -3.7, y: -.4 }, displayWidth: 165, collision: { kind: 'rect', x: -3.7, y: -.4, width: 1.8, height: .65 }, interaction: { title: 'Garden Bench', description: 'A peaceful place to watch the plaza.', actionLabel: 'Sit', action: 'sit', icon: '•' } },
    { id: 'bench-south', asset: worldAssets.bench, category: 'furniture', position: { x: .1, y: 4.6 }, displayWidth: 145, collision: { kind: 'rect', x: .1, y: 4.6, width: 1.65, height: .6 }, interaction: { title: 'Plaza Bench', description: 'Take a break near the main walkway.', actionLabel: 'Sit', action: 'sit', icon: '•' } },
    { id: 'lamp-east', asset: worldAssets.lamp, category: 'prop', position: { x: 3.6, y: 3 }, displayWidth: 92, collision: { kind: 'circle', x: 3.6, y: 3, radius: .35 }, ambient: 'glow' },
    { id: 'lamp-west', asset: worldAssets.lamp, category: 'prop', position: { x: -1.4, y: -3.4 }, displayWidth: 82, collision: { kind: 'circle', x: -1.4, y: -3.4, radius: .32 }, ambient: 'glow' },
    { id: 'planter', asset: worldAssets.planter, category: 'vegetation', position: { x: -4.2, y: .6 }, displayWidth: 95, collision: { kind: 'circle', x: -4.2, y: .6, radius: .48 } },
    { id: 'sign', asset: worldAssets.sign, category: 'prop', position: { x: -1.25, y: -2.2 }, displayWidth: 58, collision: { kind: 'circle', x: -1.25, y: -2.2, radius: .28 }, depthBias: 2 },
    { id: 'cafe-table', asset: worldAssets.table, category: 'furniture', position: { x: -1.4, y: 1 }, displayWidth: 88, collision: { kind: 'circle', x: -1.4, y: 1, radius: .55 } },
    { id: 'cafe-chair', asset: worldAssets.chair, category: 'furniture', position: { x: -.65, y: 1.35 }, displayWidth: 48, collision: { kind: 'circle', x: -.65, y: 1.35, radius: .3 } },
  ],
  avatars: [
    { id: 'player', name: 'You', position: { x: 1.2, y: 4.25 }, tint: 0x8bd7ff, player: true },
    { id: 'alex', name: 'Alex', position: { x: -1.8, y: 1.6 }, tint: 0x72e0c2 },
    { id: 'maya', name: 'Maya', position: { x: 2.15, y: 2.1 }, tint: 0xff9dbc },
    { id: 'sofia', name: 'Sofia', position: { x: 1.5, y: -1 }, tint: 0xc5a3ff },
  ],
};
