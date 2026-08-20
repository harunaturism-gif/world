import type { RoomCellDefinition, RoomDefinition, RoomGeometryDefinition } from './roomEngine';

export const worldAssets = {
  ground: '/assets/world/ground/plaza-stone-a.svg',
  groundVariant: '/assets/world/ground/plaza-stone-b.svg',
  path: '/assets/world/ground/plaza-path.svg',
  garden: '/assets/world/ground/garden-tile.svg',
  platform: '/assets/world/ground/platform-tile.svg',
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

function createPlazaGeometry(): RoomGeometryDefinition {
  const rowExtents = new Map<number, [number, number]>([
    [-5, [-3, 4]], [-4, [-5, 5]], [-3, [-6, 6]], [-2, [-6, 6]], [-1, [-6, 6]],
    [0, [-6, 6]], [1, [-6, 6]], [2, [-6, 6]], [3, [-6, 6]], [4, [-5, 5]], [5, [-3, 4]],
  ]);
  const coordinates: { x: number; y: number }[] = [];
  rowExtents.forEach(([minX, maxX], y) => {
    for (let x = minX; x <= maxX; x += 1) coordinates.push({ x, y });
  });
  const coordinateKeys = new Set(coordinates.map(({ x, y }) => `${x},${y}`));
  const cells: RoomCellDefinition[] = coordinates.map(({ x, y }) => {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !coordinateKeys.has(`${x + dx},${y + dy}`));
    const entrance = (y === 5 && x >= 0 && x <= 2) || (y === -5 && x >= 1 && x <= 3);
    const centralPlatform = Math.hypot(x, y) <= 2;
    const walkway = Math.abs(x) <= 1 || Math.abs(y) <= 1 || (x <= -2 && y >= 2) || (x >= 2 && y <= -2);
    const material = edge && !entrance ? 'garden' : centralPlatform ? 'platform' : walkway ? 'path' : 'stone';
    return { x, y, elevation: centralPlatform ? 0.18 : 0, material, walkable: material !== 'garden' };
  });
  return {
    cells,
    spawn: { x: 1.5, y: 4.25 },
    maxStepHeight: 0.5,
    exits: [
      { id: 'south-gate', position: { x: 1, y: 5 }, targetRoomId: 'world-map', label: 'World Gate' },
      { id: 'cafe-door', position: { x: -1.5, y: 1.75 }, targetRoomId: 'lunas-cafe', label: "Luna's Cafe" },
      { id: 'market-gate', position: { x: 1.5, y: -1.5 }, targetRoomId: 'market', label: 'Fresh Market' },
    ],
    walls: [
      { id: 'north-fence', from: { x: -3.5, y: -5 }, to: { x: 0.5, y: -5 }, kind: 'fence', height: 26, thickness: 0.14, blocksMovement: true },
      { id: 'west-garden-wall', from: { x: -6, y: -2.5 }, to: { x: -6, y: 1.5 }, kind: 'curb', height: 14, thickness: 0.12, blocksMovement: true },
      { id: 'east-garden-wall', from: { x: 6, y: -0.5 }, to: { x: 6, y: 3 }, kind: 'curb', height: 14, thickness: 0.12, blocksMovement: true },
    ],
  };
}

export const centralPlazaRoom: RoomDefinition = {
  id: 'central-plaza',
  name: 'Central Plaza',
  geometry: createPlazaGeometry(),
  floor: { materials: { stone: [worldAssets.ground, worldAssets.groundVariant], path: [worldAssets.path], garden: [worldAssets.garden], platform: [worldAssets.platform] } },
  ui: { subtitle: 'Social district · 3 residents online', help: 'Click to move · WASD / arrows · tap glowing objects or residents' },
  objects: [
    { id: 'cafe', asset: worldAssets.cafe, category: 'building', position: { x: -3.15, y: 3 }, displayWidth: 245, collision: { kind: 'rect', x: -3.15, y: 3, width: 2.9, height: 1.9 }, interactionPoint: { x: -1.5, y: 1.75 }, interaction: { title: "Luna's Cafe", description: 'A warm social space serving the plaza.', actionLabel: 'Enter Cafe', action: 'enter-room', targetId: 'lunas-cafe', icon: '☕' } },
    { id: 'market', asset: worldAssets.stall, category: 'building', position: { x: 3.1, y: -2.7 }, displayWidth: 225, collision: { kind: 'rect', x: 3.1, y: -2.7, width: 2.2, height: 1.5 }, interactionPoint: { x: 1.5, y: -1.5 }, interaction: { title: 'Fresh Market', description: 'Colorful local goods from demo residents.', actionLabel: 'Visit Market', action: 'inspect', icon: '✦' } },
    { id: 'tree', asset: worldAssets.tree, category: 'vegetation', position: { x: 3.5, y: .9 }, displayWidth: 275, collision: { kind: 'circle', x: 3.5, y: .9, radius: .78 }, ambient: 'float' },
    { id: 'fountain', asset: worldAssets.fountain, category: 'landmark', position: { x: 0, y: -.15 }, displayWidth: 245, collision: { kind: 'circle', x: 0, y: -.15, radius: 1.25 }, interactionPoint: { x: 0, y: 1.5 }, interaction: { title: 'Atlas Fountain', description: 'The heart of Central Plaza hums with blue light.', actionLabel: 'Drink Water', action: 'use', icon: '◆' }, ambient: 'glow' },
    { id: 'bench-west', asset: worldAssets.bench, category: 'furniture', position: { x: -3.6, y: -.2 }, displayWidth: 165, collision: { kind: 'rect', x: -3.6, y: -.2, width: 1.8, height: .65 }, interactionPoint: { x: -2.5, y: .5 }, interaction: { title: 'Garden Bench', description: 'A peaceful place to watch the plaza.', actionLabel: 'Sit', action: 'sit', icon: '•' } },
    { id: 'bench-south', asset: worldAssets.bench, category: 'furniture', position: { x: -1.35, y: 4.1 }, displayWidth: 145, collision: { kind: 'rect', x: -1.35, y: 4.1, width: 1.65, height: .6 }, interactionPoint: { x: -.2, y: 3.4 }, interaction: { title: 'Plaza Bench', description: 'Take a break near the main walkway.', actionLabel: 'Sit', action: 'sit', icon: '•' } },
    { id: 'lamp-east', asset: worldAssets.lamp, category: 'prop', position: { x: 3.6, y: 3 }, displayWidth: 92, collision: { kind: 'circle', x: 3.6, y: 3, radius: .35 }, ambient: 'glow' },
    { id: 'lamp-west', asset: worldAssets.lamp, category: 'prop', position: { x: -1.4, y: -3.4 }, displayWidth: 82, collision: { kind: 'circle', x: -1.4, y: -3.4, radius: .32 }, ambient: 'glow' },
    { id: 'planter', asset: worldAssets.planter, category: 'vegetation', position: { x: -4.2, y: .6 }, displayWidth: 95, collision: { kind: 'circle', x: -4.2, y: .6, radius: .48 } },
    { id: 'sign', asset: worldAssets.sign, category: 'prop', position: { x: -1.25, y: -2.2 }, displayWidth: 58, collision: { kind: 'circle', x: -1.25, y: -2.2, radius: .28 }, depthBias: 2 },
    { id: 'cafe-table', asset: worldAssets.table, category: 'furniture', position: { x: -1.4, y: 1 }, displayWidth: 88, collision: { kind: 'circle', x: -1.4, y: 1, radius: .55 } },
    { id: 'cafe-chair', asset: worldAssets.chair, category: 'furniture', position: { x: -.65, y: 1.35 }, displayWidth: 48, collision: { kind: 'circle', x: -.65, y: 1.35, radius: .3 } },
  ],
  avatars: [
    { id: 'player', name: 'You', position: { x: 1.5, y: 4.25 }, palette: { skin: 0xf2b78d, hair: 0x273250, outfit: 0x4c83d8, accessory: 0xffd166 }, appearance: socialAvatar, player: true },
    { id: 'alex', name: 'Alex', position: { x: -1.8, y: 1.6 }, palette: { skin: 0xc9825b, hair: 0x38261f, outfit: 0x43b995, accessory: 0xffc857 }, appearance: socialAvatar, patrol: [{ x: -1.8, y: 1.6 }, { x: -2.45, y: 1.05 }] },
    { id: 'maya', name: 'Maya', position: { x: 2.15, y: 2.1 }, palette: { skin: 0xdda179, hair: 0x612b3d, outfit: 0xe9658b, accessory: 0x76e8c8 }, appearance: socialAvatar, patrol: [{ x: 2.15, y: 2.1 }, { x: 2.65, y: 2.7 }] },
    { id: 'sofia', name: 'Sofia', position: { x: 1.5, y: -1 }, palette: { skin: 0xf0bd93, hair: 0x2f244a, outfit: 0x8f76d6, accessory: 0xffd166 }, appearance: socialAvatar, patrol: [{ x: 1.5, y: -1 }, { x: 1.85, y: -.55 }] },
  ],
};
