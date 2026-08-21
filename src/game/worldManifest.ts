import type { AvatarAppearance, RoomCellDefinition, RoomDefinition, RoomGeometryDefinition } from './roomEngine';

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
  playerAtlas: '/assets/world/characters/human-world-avatar-atlas.png',
  alexAtlas: '/assets/world/characters/alex-avatar-atlas.png',
  mayaAtlas: '/assets/world/characters/maya-avatar-atlas.png',
  sofiaAtlas: '/assets/world/characters/sofia-avatar-atlas.png',
} as const;

const avatarAppearance = (asset: string, renderWidth = 116): AvatarAppearance => ({
  frameColumns: 4,
  frameRows: 4,
  renderWidth,
  layers: [{ slot: 'body', asset }],
});

const playerAppearance = avatarAppearance(worldAssets.playerAtlas, 116);
const alexAppearance = avatarAppearance(worldAssets.alexAtlas, 120);
const mayaAppearance = avatarAppearance(worldAssets.mayaAtlas, 116);
const sofiaAppearance = avatarAppearance(worldAssets.sofiaAtlas, 120);

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
      { id: 'north-market-curb', from: { x: 1, y: -5 }, to: { x: 4.5, y: -5 }, kind: 'curb', height: 11, thickness: 0.1 },
      { id: 'south-cafe-curb', from: { x: -3, y: 5 }, to: { x: -0.5, y: 5 }, kind: 'curb', height: 11, thickness: 0.1 },
    ],
  };
}

const interactiveBench = (title: string) => ({ title, description: 'A comfortable spot for a quick plaza catch-up.', actionLabel: 'Sit', action: 'sit' as const, icon: '•' });

export const centralPlazaRoom: RoomDefinition = {
  id: 'central-plaza',
  name: 'Central Plaza',
  geometry: createPlazaGeometry(),
  floor: { materials: { stone: [worldAssets.ground, worldAssets.groundVariant], path: [worldAssets.path], garden: [worldAssets.garden], platform: [worldAssets.platform] } },
  ui: { subtitle: 'Central Plaza · Social district', help: 'Click to move · WASD / arrows · tap residents and glowing places' },
  objects: [
    { id: 'cafe', asset: worldAssets.cafe, category: 'building', position: { x: -3.15, y: 3 }, displayWidth: 245, collision: { kind: 'rect', x: -3.15, y: 3, width: 2.9, height: 1.9 }, interactionPoint: { x: -1.5, y: 1.75 }, interaction: { title: "Luna's Cafe", description: 'Warm lights, fresh coffee, and a table waiting inside.', actionLabel: 'Enter Cafe', action: 'enter-room', targetId: 'lunas-cafe', icon: '☕' } },
    { id: 'market', asset: worldAssets.stall, category: 'building', position: { x: 3.1, y: -2.7 }, displayWidth: 225, collision: { kind: 'rect', x: 3.1, y: -2.7, width: 2.2, height: 1.5 }, interactionPoint: { x: 1.5, y: -1.5 }, interaction: { title: 'Fresh Market', description: 'Colorful local goods and residents trading plaza tips.', actionLabel: 'Visit Market', action: 'inspect', icon: '✦' }, ambient: 'sway' },
    { id: 'tree', asset: worldAssets.tree, category: 'vegetation', position: { x: 3.5, y: 0.9 }, displayWidth: 275, collision: { kind: 'circle', x: 3.5, y: 0.9, radius: 0.78 }, ambient: 'float' },
    { id: 'fountain', asset: worldAssets.fountain, category: 'landmark', position: { x: 0, y: -0.15 }, displayWidth: 245, collision: { kind: 'circle', x: 0, y: -0.15, radius: 1.25 }, interactionPoint: { x: 0, y: 1.5 }, interaction: { title: 'Atlas Fountain', description: 'The social heart of Central Plaza shimmers with blue light.', actionLabel: 'Drink Water', action: 'use', icon: '◆' }, ambient: 'glow' },
    { id: 'bench-west', asset: worldAssets.bench, category: 'furniture', position: { x: -3.6, y: -0.2 }, displayWidth: 165, collision: { kind: 'rect', x: -3.6, y: -0.2, width: 1.8, height: 0.65 }, interactionPoint: { x: -2.5, y: 0.5 }, interaction: interactiveBench('Garden Bench') },
    { id: 'bench-south', asset: worldAssets.bench, category: 'furniture', position: { x: -1.35, y: 4.1 }, displayWidth: 145, collision: { kind: 'rect', x: -1.35, y: 4.1, width: 1.65, height: 0.6 }, interactionPoint: { x: -0.2, y: 3.4 }, interaction: interactiveBench('Plaza Bench') },
    { id: 'bench-east', asset: worldAssets.bench, category: 'furniture', position: { x: 3.05, y: 2.6 }, displayWidth: 138, collision: { kind: 'rect', x: 3.05, y: 2.6, width: 1.5, height: 0.58 }, interactionPoint: { x: 2.25, y: 2.05 }, interaction: interactiveBench('Tree Walk Bench') },
    { id: 'bench-north', asset: worldAssets.bench, category: 'furniture', position: { x: -0.5, y: -3.75 }, displayWidth: 132, collision: { kind: 'rect', x: -0.5, y: -3.75, width: 1.45, height: 0.55 } },
    { id: 'lamp-east', asset: worldAssets.lamp, category: 'prop', position: { x: 3.8, y: 3.35 }, displayWidth: 92, collision: { kind: 'circle', x: 3.8, y: 3.35, radius: 0.35 }, ambient: 'glow' },
    { id: 'lamp-west', asset: worldAssets.lamp, category: 'prop', position: { x: -1.4, y: -3.4 }, displayWidth: 82, collision: { kind: 'circle', x: -1.4, y: -3.4, radius: 0.32 }, ambient: 'glow' },
    { id: 'lamp-south', asset: worldAssets.lamp, category: 'prop', position: { x: 3.2, y: 4.15 }, displayWidth: 78, collision: { kind: 'circle', x: 3.2, y: 4.15, radius: 0.3 }, ambient: 'glow' },
    { id: 'lamp-north', asset: worldAssets.lamp, category: 'prop', position: { x: 0.5, y: -4.35 }, displayWidth: 78, collision: { kind: 'circle', x: 0.5, y: -4.35, radius: 0.3 }, ambient: 'glow' },
    { id: 'planter-west', asset: worldAssets.planter, category: 'vegetation', position: { x: -4.2, y: 0.6 }, displayWidth: 95, collision: { kind: 'circle', x: -4.2, y: 0.6, radius: 0.48 } },
    { id: 'planter-cafe', asset: worldAssets.planter, category: 'vegetation', position: { x: -4.85, y: 2 }, displayWidth: 82, collision: { kind: 'circle', x: -4.85, y: 2, radius: 0.42 } },
    { id: 'planter-market', asset: worldAssets.planter, category: 'vegetation', position: { x: 4.55, y: -1.35 }, displayWidth: 82, collision: { kind: 'circle', x: 4.55, y: -1.35, radius: 0.42 } },
    { id: 'planter-entry', asset: worldAssets.planter, category: 'vegetation', position: { x: -0.4, y: 4.85 }, displayWidth: 76, collision: { kind: 'circle', x: -0.4, y: 4.85, radius: 0.4 } },
    { id: 'sign-gallery', asset: worldAssets.sign, category: 'prop', position: { x: -1.25, y: -2.2 }, displayWidth: 58, collision: { kind: 'circle', x: -1.25, y: -2.2, radius: 0.28 }, depthBias: 2, interaction: { title: 'District Sign', description: 'Gallery walk north · Cafe and social tables south.', actionLabel: 'Read Sign', action: 'inspect', icon: '↗' } },
    { id: 'sign-market', asset: worldAssets.sign, category: 'prop', position: { x: 1.8, y: -3.55 }, displayWidth: 54, collision: { kind: 'circle', x: 1.8, y: -3.55, radius: 0.26 }, depthBias: 2 },
    { id: 'cafe-table-one', asset: worldAssets.table, category: 'furniture', position: { x: -1.4, y: 1 }, displayWidth: 88, collision: { kind: 'circle', x: -1.4, y: 1, radius: 0.55 } },
    { id: 'cafe-chair-one', asset: worldAssets.chair, category: 'furniture', position: { x: -0.65, y: 1.35 }, displayWidth: 48, collision: { kind: 'circle', x: -0.65, y: 1.35, radius: 0.3 } },
    { id: 'cafe-table-two', asset: worldAssets.table, category: 'furniture', position: { x: -2.15, y: 1.3 }, displayWidth: 82, collision: { kind: 'circle', x: -2.15, y: 1.3, radius: 0.5 } },
    { id: 'cafe-chair-two', asset: worldAssets.chair, category: 'furniture', position: { x: -2.75, y: 1.5 }, displayWidth: 46, collision: { kind: 'circle', x: -2.75, y: 1.5, radius: 0.28 } },
    { id: 'cafe-chair-three', asset: worldAssets.chair, category: 'furniture', position: { x: -1.9, y: 2 }, displayWidth: 44, collision: { kind: 'circle', x: -1.9, y: 2, radius: 0.26 } },
    { id: 'market-table', asset: worldAssets.table, category: 'furniture', position: { x: 1.85, y: -2.25 }, displayWidth: 74, collision: { kind: 'circle', x: 1.85, y: -2.25, radius: 0.46 } },
    { id: 'market-chair', asset: worldAssets.chair, category: 'furniture', position: { x: 1.2, y: -2.65 }, displayWidth: 42, collision: { kind: 'circle', x: 1.2, y: -2.65, radius: 0.25 } },
  ],
  avatars: [
    { id: 'player', name: 'You', position: { x: 1.5, y: 4.25 }, palette: { skin: 0xf2b78d, hair: 0x273250, outfit: 0x4c83d8, accessory: 0xffd166 }, appearance: playerAppearance, player: true },
    { id: 'alex', name: 'Alex', position: { x: -1.25, y: 2.45 }, palette: { skin: 0x7c4328, hair: 0x26180f, outfit: 0x285c58, accessory: 0xd99b2b }, appearance: alexAppearance, patrol: [{ x: -1.25, y: 2.45 }, { x: -0.75, y: 2.1 }], ambientSpeech: ["Coffee's almost ready.", 'Grab a seat—everyone is welcome.'] },
    { id: 'noor', name: 'Noor', position: { x: -0.55, y: 0.55 }, palette: { skin: 0xd6966c, hair: 0x2b1d21, outfit: 0xe06050, accessory: 0xffcf6a }, appearance: mayaAppearance, patrol: [{ x: -0.55, y: 0.55 }, { x: -0.9, y: 0.15 }], ambientSpeech: ['This plaza gets better every day.', 'Meet you at the cafe table?'] },
    { id: 'theo', name: 'Theo', position: { x: 0.25, y: 3.25 }, palette: { skin: 0x8b512f, hair: 0x241813, outfit: 0x315f59, accessory: 0xd99b2b }, appearance: alexAppearance, patrol: [{ x: 0.25, y: 3.25 }, { x: 0.9, y: 3.6 }], ambientSpeech: ['Hey! Welcome in.', 'The market is lively today.'] },
    { id: 'maya', name: 'Maya', position: { x: 1.25, y: 1.25 }, palette: { skin: 0xb86e43, hair: 0x1d1719, outfit: 0xe96558, accessory: 0xffd166 }, appearance: mayaAppearance, patrol: [{ x: 1.25, y: 1.25 }, { x: 1.6, y: 0.85 }], ambientSpeech: ['Meet by the fountain?', 'The light on the water is perfect.'] },
    { id: 'diego', name: 'Diego', position: { x: 1.5, y: 0.15 }, palette: { skin: 0x805031, hair: 0x241813, outfit: 0x285c58, accessory: 0xd99b2b }, appearance: alexAppearance, patrol: [{ x: 1.5, y: 0.15 }, { x: 1.55, y: -0.5 }], ambientSpeech: ['That water glow is beautiful.', 'Anyone up for the gallery?'] },
    { id: 'hana', name: 'Hana', position: { x: 0.55, y: -1.65 }, palette: { skin: 0xd7956d, hair: 0x1c171d, outfit: 0xe65d52, accessory: 0xffcf6a }, appearance: mayaAppearance, patrol: [{ x: 0.55, y: -1.65 }, { x: 0.95, y: -1.35 }], ambientSpeech: ['Photo by the fountain?', 'I love this song.'] },
    { id: 'sofia', name: 'Sofia', position: { x: 2.35, y: 1.8 }, palette: { skin: 0xd99a6b, hair: 0xa79bc0, outfit: 0x504b83, accessory: 0x4c9d8e }, appearance: sofiaAppearance, patrol: [{ x: 2.35, y: 1.8 }, { x: 2.25, y: 2.25 }], ambientSpeech: ['I saved you a bench.', 'The garden path is my favorite.'] },
    { id: 'leila', name: 'Leila', position: { x: 2.15, y: 3.05 }, palette: { skin: 0xd59a70, hair: 0x8f85aa, outfit: 0x524b84, accessory: 0x4c9d8e }, appearance: sofiaAppearance, patrol: [{ x: 2.15, y: 3.05 }, { x: 2.65, y: 3.15 }], ambientSpeech: ['The garden smells amazing.', 'Come sit with us.'] },
    { id: 'omar', name: 'Omar', position: { x: 1.1, y: -2.05 }, palette: { skin: 0x7d492d, hair: 0x221712, outfit: 0x285c58, accessory: 0xd99b2b }, appearance: alexAppearance, patrol: [{ x: 1.1, y: -2.05 }, { x: 0.65, y: -2.6 }], ambientSpeech: ['Fresh fruit at the market!', 'The oranges arrived this morning.'] },
    { id: 'june', name: 'June', position: { x: 2.15, y: -4.1 }, palette: { skin: 0xe3a579, hair: 0x19171e, outfit: 0xe56356, accessory: 0xffcf6a }, appearance: mayaAppearance, patrol: [{ x: 2.15, y: -4.1 }, { x: 2.8, y: -4.15 }], ambientSpeech: ['Anyone heading to the gallery?', 'The north walk is open.'] },
    { id: 'ravi', name: 'Ravi', position: { x: -2.25, y: -2.35 }, palette: { skin: 0xd7956d, hair: 0x998eae, outfit: 0x514b84, accessory: 0x4c9d8e }, appearance: sofiaAppearance, patrol: [{ x: -2.25, y: -2.35 }, { x: -2.5, y: -1.75 }], ambientSpeech: ['Love the music out here.', 'Central Plaza feels alive tonight.'] },
  ],
};
