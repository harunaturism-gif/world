import type { AvatarAppearance, RoomCellDefinition, RoomDefinition, RoomGeometryDefinition } from './roomEngine';

const roomRoot = '/assets/world/social-room';

export const worldAssets = {
  ground: `${roomRoot}/floor/stone.svg`, groundVariant: `${roomRoot}/floor/stone-dark.svg`, path: `${roomRoot}/floor/wood.svg`, garden: `${roomRoot}/floor/stone-dark.svg`, platform: `${roomRoot}/floor/rug.svg`,
  wallX: `${roomRoot}/walls/wall-x.svg`, wallY: `${roomRoot}/walls/wall-y.svg`,
  chair: `${roomRoot}/furniture/chair.svg`, table: `${roomRoot}/furniture/table.svg`, sofa: `${roomRoot}/furniture/sofa.svg`, plant: `${roomRoot}/furniture/plant.svg`, lamp: `${roomRoot}/furniture/lamp.svg`, cafeCounter: `${roomRoot}/furniture/cafe-counter.svg`, communityBoard: `${roomRoot}/furniture/community-board.svg`, marketStand: `${roomRoot}/furniture/market-stand.svg`, fountain: `${roomRoot}/furniture/fountain.svg`, divider: `${roomRoot}/furniture/divider.svg`,
  avatarShadow: '/assets/world/characters/avatar-shadow.svg', playerAtlas: `${roomRoot}/characters/player-atlas.png`, alexAtlas: `${roomRoot}/characters/alex-atlas.png`, mayaAtlas: `${roomRoot}/characters/maya-atlas.png`, sofiaAtlas: `${roomRoot}/characters/sofia-atlas.png`,
} as const;

const avatarAppearance = (asset: string, renderWidth = 140): AvatarAppearance => ({ frameColumns: 4, frameRows: 4, renderWidth, layers: [{ slot: 'body', asset }] });
const appearances = { player: avatarAppearance(worldAssets.playerAtlas, 142), alex: avatarAppearance(worldAssets.alexAtlas), maya: avatarAppearance(worldAssets.mayaAtlas, 142), sofia: avatarAppearance(worldAssets.sofiaAtlas, 142) };

function createSocialRoomGeometry(): RoomGeometryDefinition {
  const cells: RoomCellDefinition[] = [];
  for (let y = -4; y <= 4; y += 1) for (let x = -4; x <= 4; x += 1) {
    const central = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    const cafe = x <= -2 && y <= 0;
    const lounge = x <= -2 && y >= 1;
    const market = x >= 2 && y <= 0;
    const material = central ? 'platform' : cafe ? 'path' : lounge ? 'platform' : market ? 'garden' : 'stone';
    cells.push({ x, y, elevation: 0, material, walkable: true });
  }
  return {
    cells, spawn: { x: 0, y: 3.65 }, maxStepHeight: 0.35,
    exits: [
      { id: 'arrival-door', position: { x: 0, y: 4 }, targetRoomId: 'world-map', label: 'World entrance' },
      { id: 'cafe-door', position: { x: -3.25, y: -1.4 }, targetRoomId: 'lunas-cafe', label: "Luna's Cafe" },
      { id: 'gallery-door', position: { x: 3.55, y: 0.6 }, targetRoomId: 'human-gallery', label: 'Human Gallery' },
    ],
    walls: [
      { id: 'north-room-wall', from: { x: -4.5, y: -4.5 }, to: { x: 4.5, y: -4.5 }, kind: 'wall', height: 126, thickness: 0.16, blocksMovement: true, asset: worldAssets.wallX, displayWidth: 132 },
      { id: 'west-room-wall', from: { x: -4.5, y: -4.5 }, to: { x: -4.5, y: 4.5 }, kind: 'wall', height: 126, thickness: 0.16, blocksMovement: true, asset: worldAssets.wallY, displayWidth: 132 },
    ],
  };
}

const sit = (title: string) => ({ title, description: 'A comfortable place to join the conversation.', actionLabel: 'Sit', action: 'sit' as const, icon: '⌁' });
const palettes = {
  player: { skin: 0xf2b78d, hair: 0x8f3322, outfit: 0x315db3, accessory: 0xf1bd55 },
  alex: { skin: 0x7c4328, hair: 0x211713, outfit: 0x28755d, accessory: 0xe4a83f },
  maya: { skin: 0xb86e43, hair: 0x171a25, outfit: 0xe45f59, accessory: 0xf1bd55 },
  sofia: { skin: 0xd99a6b, hair: 0xbab1cf, outfit: 0x4c568b, accessory: 0x2f8780 },
};

export const centralPlazaRoom: RoomDefinition = {
  id: 'central-plaza', name: 'Central Plaza Social Room', geometry: createSocialRoomGeometry(),
  floor: { materials: { stone: [worldAssets.ground], path: [worldAssets.path], garden: [worldAssets.groundVariant], platform: [worldAssets.platform] } },
  ui: { subtitle: 'Central Plaza · 15 humans online', help: 'Click a tile to walk · WASD / arrows · tap people and furniture' },
  objects: [
    { id: 'fountain', asset: worldAssets.fountain, category: 'landmark', position: { x: 0, y: 0 }, displayWidth: 216, collision: { kind: 'circle', x: 0, y: 0, radius: 1.02 }, interactionPoint: { x: 0, y: 1.45 }, ambient: 'glow', interaction: { title: 'Human Fountain', description: 'The shared landmark at the center of the room.', actionLabel: 'Make a wish', action: 'use', icon: '◆' } },
    { id: 'cafe-counter', asset: worldAssets.cafeCounter, category: 'building', position: { x: -2.65, y: -3 }, displayWidth: 210, collision: { kind: 'rect', x: -2.65, y: -3, width: 2.45, height: 0.82 }, interactionPoint: { x: -2.2, y: -1.9 }, interaction: { title: "Luna's Cafe", description: 'A warm corner for coffee and conversation.', actionLabel: 'Enter Cafe', action: 'enter-room', targetId: 'lunas-cafe', icon: '☕' } },
    { id: 'cafe-table', asset: worldAssets.table, category: 'furniture', position: { x: -2.25, y: -1.2 }, displayWidth: 112, collision: { kind: 'circle', x: -2.25, y: -1.2, radius: 0.58 }, interaction: { title: 'Cafe table', description: 'Two cups and an open seat.', actionLabel: 'Join table', action: 'sit', icon: '☕' } },
    { id: 'cafe-chair-a', asset: worldAssets.chair, category: 'furniture', position: { x: -3.15, y: -1.05 }, displayWidth: 68, collision: { kind: 'circle', x: -3.15, y: -1.05, radius: 0.3 } },
    { id: 'cafe-chair-b', asset: worldAssets.chair, category: 'furniture', position: { x: -1.55, y: -1.7 }, displayWidth: 68, collision: { kind: 'circle', x: -1.55, y: -1.7, radius: 0.3 } },
    { id: 'cafe-plant', asset: worldAssets.plant, category: 'vegetation', position: { x: -3.85, y: -2.2 }, displayWidth: 82, collision: { kind: 'circle', x: -3.85, y: -2.2, radius: 0.36 } },
    { id: 'cafe-lamp', asset: worldAssets.lamp, category: 'prop', position: { x: -1.25, y: -3.55 }, displayWidth: 62, collision: { kind: 'circle', x: -1.25, y: -3.55, radius: 0.22 }, ambient: 'glow' },
    { id: 'market-stand', asset: worldAssets.marketStand, category: 'building', position: { x: 2.65, y: -2.8 }, displayWidth: 194, collision: { kind: 'rect', x: 2.65, y: -2.8, width: 2.1, height: 0.9 }, interactionPoint: { x: 2.2, y: -1.55 }, ambient: 'sway', interaction: { title: 'Neighbourhood Market', description: 'Browse colorful local goods and meet the makers.', actionLabel: 'Visit Market', action: 'inspect', icon: '✦' } },
    { id: 'market-table', asset: worldAssets.table, category: 'furniture', position: { x: 2.8, y: -1.15 }, displayWidth: 94, collision: { kind: 'circle', x: 2.8, y: -1.15, radius: 0.5 } },
    { id: 'market-plant', asset: worldAssets.plant, category: 'vegetation', position: { x: 3.75, y: -1.3 }, displayWidth: 76, collision: { kind: 'circle', x: 3.75, y: -1.3, radius: 0.33 } },
    { id: 'lounge-sofa', asset: worldAssets.sofa, category: 'furniture', position: { x: -2.75, y: 2.7 }, displayWidth: 174, collision: { kind: 'rect', x: -2.75, y: 2.7, width: 1.95, height: 0.72 }, interactionPoint: { x: -1.8, y: 1.9 }, interaction: sit('Community sofa') },
    { id: 'lounge-table', asset: worldAssets.table, category: 'furniture', position: { x: -2.3, y: 1.25 }, displayWidth: 94, collision: { kind: 'circle', x: -2.3, y: 1.25, radius: 0.48 } },
    { id: 'lounge-chair', asset: worldAssets.chair, category: 'furniture', position: { x: -3.45, y: 1.45 }, displayWidth: 66, collision: { kind: 'circle', x: -3.45, y: 1.45, radius: 0.29 }, interaction: sit('Lounge chair') },
    { id: 'lounge-lamp', asset: worldAssets.lamp, category: 'prop', position: { x: -3.75, y: 3.55 }, displayWidth: 64, collision: { kind: 'circle', x: -3.75, y: 3.55, radius: 0.22 }, ambient: 'glow' },
    { id: 'lounge-plant', asset: worldAssets.plant, category: 'vegetation', position: { x: -1.25, y: 3.45 }, displayWidth: 76, collision: { kind: 'circle', x: -1.25, y: 3.45, radius: 0.33 } },
    { id: 'community-board', asset: worldAssets.communityBoard, category: 'world-item', position: { x: 3.25, y: 2.65 }, displayWidth: 124, collision: { kind: 'rect', x: 3.25, y: 2.65, width: 0.86, height: 0.38 }, interactionPoint: { x: 2.45, y: 2 }, interaction: { title: 'Community Board', description: 'Tonight: open mic, maker swap, and a gallery walk.', actionLabel: 'Read events', action: 'inspect', icon: '!' } },
    { id: 'event-table', asset: worldAssets.table, category: 'furniture', position: { x: 2.35, y: 1.1 }, displayWidth: 94, collision: { kind: 'circle', x: 2.35, y: 1.1, radius: 0.48 } },
    { id: 'event-chair', asset: worldAssets.chair, category: 'furniture', position: { x: 3.3, y: 1.15 }, displayWidth: 64, collision: { kind: 'circle', x: 3.3, y: 1.15, radius: 0.28 }, interaction: sit('Event chair') },
    { id: 'gallery-divider', asset: worldAssets.divider, category: 'prop', position: { x: 3.75, y: 0.1 }, displayWidth: 122, collision: { kind: 'rect', x: 3.75, y: 0.1, width: 1.1, height: 0.34 }, interactionPoint: { x: 3.05, y: 0.45 }, interaction: { title: 'Human Gallery', description: 'Original work from creators across Human World.', actionLabel: 'Enter Gallery', action: 'enter-room', targetId: 'human-gallery', icon: '↗' } },
    { id: 'entry-divider-left', asset: worldAssets.divider, category: 'prop', position: { x: -2.55, y: 4 }, displayWidth: 118, collision: { kind: 'rect', x: -2.55, y: 4, width: 1.2, height: 0.32 } },
    { id: 'entry-divider-right', asset: worldAssets.divider, category: 'prop', position: { x: 2.55, y: 4 }, displayWidth: 118, collision: { kind: 'rect', x: 2.55, y: 4, width: 1.2, height: 0.32 } },
    { id: 'entry-lamp-left', asset: worldAssets.lamp, category: 'prop', position: { x: -1.5, y: 4 }, displayWidth: 62, collision: { kind: 'circle', x: -1.5, y: 4, radius: 0.22 }, ambient: 'glow' },
    { id: 'entry-lamp-right', asset: worldAssets.lamp, category: 'prop', position: { x: 1.5, y: 4 }, displayWidth: 62, collision: { kind: 'circle', x: 1.5, y: 4, radius: 0.22 }, ambient: 'glow' },
  ],
  avatars: [
    { id: 'player', name: 'You', position: { x: 0, y: 3.65 }, palette: palettes.player, appearance: appearances.player, player: true },
    { id: 'alex', name: 'Alex', position: { x: -2.05, y: -2.05 }, palette: palettes.alex, appearance: appearances.alex, patrol: [{ x: -2.05, y: -2.05 }, { x: -1.2, y: -1.2 }], ambientSpeech: ['Coffee is on me.', 'Welcome to the room!'] },
    { id: 'iris', name: 'Iris', position: { x: -3.35, y: -1.75 }, palette: palettes.sofia, appearance: appearances.sofia, ambientSpeech: ['Open mic later?'] },
    { id: 'noor', name: 'Noor', position: { x: -1.25, y: -2.45 }, palette: palettes.maya, appearance: appearances.maya, ambientSpeech: ['This corner is cozy.'] },
    { id: 'maya', name: 'Maya', position: { x: 0.9, y: 1.45 }, palette: palettes.maya, appearance: appearances.maya, patrol: [{ x: 0.9, y: 1.45 }, { x: 1.35, y: 0.8 }], ambientSpeech: ['Meet by the fountain?'] },
    { id: 'diego', name: 'Diego', position: { x: 1.25, y: -0.45 }, palette: palettes.alex, appearance: appearances.alex, patrol: [{ x: 1.25, y: -0.45 }, { x: 1.6, y: 0.15 }], ambientSpeech: ['The room is buzzing.'] },
    { id: 'hana', name: 'Hana', position: { x: -0.85, y: 1.05 }, palette: palettes.maya, appearance: appearances.maya, ambientSpeech: ['Great spot for a photo.'] },
    { id: 'sofia', name: 'Sofia', position: { x: -2.8, y: 2.45 }, palette: palettes.sofia, appearance: appearances.sofia, pose: 'sit', depthBias: -1, ambientSpeech: ['I saved you a seat.'] },
    { id: 'leila', name: 'Leila', position: { x: -3.45, y: 1.3 }, palette: palettes.maya, appearance: appearances.maya, pose: 'sit', depthBias: -1, ambientSpeech: ['Come join us.'] },
    { id: 'ravi', name: 'Ravi', position: { x: -1.55, y: 2.1 }, palette: palettes.alex, appearance: appearances.alex, ambientSpeech: ['Love the lounge playlist.'] },
    { id: 'omar', name: 'Omar', position: { x: 2.1, y: -1.85 }, palette: palettes.alex, appearance: appearances.alex, ambientSpeech: ['Fresh finds today!'] },
    { id: 'june', name: 'June', position: { x: 3.35, y: -1.55 }, palette: palettes.sofia, appearance: appearances.sofia, patrol: [{ x: 3.35, y: -1.55 }, { x: 2.25, y: -0.75 }], ambientSpeech: ['Want to browse?'] },
    { id: 'nico', name: 'Nico', position: { x: 2.15, y: -3.55 }, palette: palettes.player, appearance: appearances.player, ambientSpeech: ['New stock just landed.'] },
    { id: 'ava', name: 'Ava', position: { x: 0.9, y: 3.45 }, palette: palettes.maya, appearance: appearances.maya, patrol: [{ x: 0.9, y: 3.45 }, { x: 0.6, y: 2.7 }], ambientSpeech: ['Glad you made it!'] },
    { id: 'theo', name: 'Theo', position: { x: 2.35, y: 2.05 }, palette: palettes.alex, appearance: appearances.alex, pose: 'sit', depthBias: -1, ambientSpeech: ['Events are on the board.'] },
  ],
};
