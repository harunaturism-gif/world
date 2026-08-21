import { placeFurniture } from './furnitureCatalog';
import { AvatarStructure } from './openHotel/AvatarStructure';
import type { AvatarAppearance, RoomAvatarDefinition, RoomCellDefinition, RoomDefinition, RoomGeometryDefinition, RoomInteraction } from './roomEngine';
import { WORLD_SCALE } from './worldScale';

const groundRoot = '/assets/world/ground';
const socialRoot = '/assets/world/social-room';
const characterRoot = '/assets/world/characters';

export const worldAssets = {
  ground: `${groundRoot}/plaza-stone-a.svg`, groundVariant: `${groundRoot}/plaza-stone-b.svg`, path: `${groundRoot}/plaza-path.svg`, garden: `${groundRoot}/garden-tile.svg`, platform: `${groundRoot}/platform-tile.svg`,
  avatarShadow: `${characterRoot}/avatar-shadow.svg`,
  playerAtlas: `${socialRoot}/characters/player-atlas.png`, alexAtlas: `${socialRoot}/characters/alex-atlas.png`, mayaAtlas: `${socialRoot}/characters/maya-atlas.png`, sofiaAtlas: `${socialRoot}/characters/sofia-atlas.png`,
} as const;

const atlasAppearance = (asset: string): AvatarAppearance => ({ frameColumns: 4, frameRows: 4, renderWidth: WORLD_SCALE.avatarHeight, layers: [{ slot: 'body', asset }] });
const modularPlayer = new AvatarStructure()
  .add({ slot: 'body', asset: `${characterRoot}/avatar-body.svg`, tint: 0x315db3 })
  .add({ slot: 'head', asset: `${characterRoot}/avatar-skin.svg`, tint: 0xf2b78d })
  .add({ slot: 'hair', asset: `${characterRoot}/avatar-hair.svg`, tint: 0x8f3322 })
  .add({ slot: 'accessory', asset: `${characterRoot}/avatar-accessory.svg`, tint: 0xf1bd55 })
  .build(WORLD_SCALE.avatarHeight);
const appearances = { player: modularPlayer, alex: atlasAppearance(worldAssets.alexAtlas), maya: atlasAppearance(worldAssets.mayaAtlas), sofia: atlasAppearance(worldAssets.sofiaAtlas) };
const palettes = {
  player: { skin: 0xf2b78d, hair: 0x8f3322, outfit: 0x315db3, accessory: 0xf1bd55 },
  alex: { skin: 0x7c4328, hair: 0x211713, outfit: 0x28755d, accessory: 0xe4a83f },
  maya: { skin: 0xb86e43, hair: 0x171a25, outfit: 0xe45f59, accessory: 0xf1bd55 },
  sofia: { skin: 0xd99a6b, hair: 0xbab1cf, outfit: 0x4c568b, accessory: 0x2f8780 },
};

function createPlazaGeometry(): RoomGeometryDefinition {
  const cells: RoomCellDefinition[] = [];
  for (let y = -7; y <= 8; y += 1) for (let x = -10; x <= 9; x += 1) {
    if ((y === -7 || y === 8) && (x < -7 || x > 7)) continue;
    if ((y === -6 || y === 7) && (x < -9 || x > 8)) continue;
    const fountainSquare = Math.abs(x) <= 3 && Math.abs(y) <= 3;
    const gardenPocket = (x <= -6 && y >= 1) || (x >= 6 && y >= 2);
    const mainPath = Math.abs(x) <= 1 || Math.abs(y) <= 1 || y >= 6;
    const cafeTerrace = x <= -5 && y <= -2;
    const marketTerrace = x >= 5 && y <= -2;
    const material = fountainSquare ? 'platform' : gardenPocket ? 'garden' : mainPath || cafeTerrace || marketTerrace ? 'path' : 'stone';
    const ornamental = gardenPocket && ((x + y) % 3 === 0) && Math.abs(x) >= 8;
    cells.push({ x, y, elevation: fountainSquare ? 0.25 : 0, material, walkable: !ornamental });
  }
  return {
    cells,
    spawn: { x: 0, y: 7 },
    maxStepHeight: 0.35,
    exits: [
      { id: 'arrival-gate', position: { x: 0, y: 8 }, targetRoomId: 'world-map', label: 'World entrance' },
      { id: 'cafe-door', position: { x: -7, y: -5.2 }, targetRoomId: 'lunas-cafe', label: "Luna's Cafe" },
      { id: 'gallery-door', position: { x: 7, y: 4.7 }, targetRoomId: 'human-gallery', label: 'Human Gallery' },
    ],
    walls: [
      { id: 'cafe-rail', from: { x: -9.4, y: -6 }, to: { x: -5.4, y: -6 }, kind: 'curb', height: 28, thickness: 0.12, blocksMovement: true, color: 0x8d5f4c },
      { id: 'market-rail', from: { x: 5.4, y: -6 }, to: { x: 8.4, y: -6 }, kind: 'curb', height: 28, thickness: 0.12, blocksMovement: true, color: 0x8d5f4c },
    ],
  };
}

const action = (title: string, description: string, actionLabel: string, type: RoomInteraction['action'], icon: string, targetId?: string): RoomInteraction => ({ title, description, actionLabel, action: type, icon, targetId });
const npc = (id: string, name: string, position: { x: number; y: number }, appearance: keyof typeof appearances, patrol?: { x: number; y: number }[], speech: string[] = []): RoomAvatarDefinition => ({ id, name, position, appearance: appearances[appearance], palette: palettes[appearance], patrol, ambientSpeech: speech });

export const centralPlazaRoom: RoomDefinition = {
  id: 'central-plaza', name: 'Central Plaza', geometry: createPlazaGeometry(),
  floor: { materials: { stone: [worldAssets.ground, worldAssets.groundVariant], path: [worldAssets.path], garden: [worldAssets.garden], platform: [worldAssets.platform] } },
  ui: { subtitle: 'Central Plaza · 14 humans online', help: 'Click/tap to walk · drag to pan · wheel or +/− to zoom · WASD / arrows' },
  objects: [
    placeFurniture('fountain', 'fountain', { x: 0, y: 0 }, { ambient: 'glow', interactionPoint: { x: 0, y: 2.1 }, interaction: action('Human Fountain', 'The landmark at the heart of Central Plaza.', 'Make a wish', 'use', '◆') }),
    placeFurniture('cafeCounter', 'cafe-counter', { x: -7.2, y: -5.1 }, { interactionPoint: { x: -6.4, y: -3.7 }, interaction: action("Luna's Cafe", 'A warm neighborhood room for coffee and conversation.', 'Enter Cafe', 'enter-room', '☕', 'lunas-cafe') }),
    placeFurniture('table', 'cafe-table-a', { x: -8, y: -2.8 }), placeFurniture('chair', 'cafe-chair-a', { x: -8.8, y: -2.3 }), placeFurniture('chair', 'cafe-chair-b', { x: -7.2, y: -3.3 }, { direction: 2 }),
    placeFurniture('table', 'cafe-table-b', { x: -5.3, y: -3.4 }), placeFurniture('chair', 'cafe-chair-c', { x: -6.1, y: -2.9 }), placeFurniture('chair', 'cafe-chair-d', { x: -4.5, y: -3.9 }, { direction: 2 }),
    placeFurniture('marketStall', 'market-stall', { x: 7, y: -4.7 }, { ambient: 'sway', interactionPoint: { x: 6.2, y: -2.9 }, interaction: action('Neighbourhood Market', 'Original wares from local Human World makers.', 'Visit Market', 'inspect', '✦') }),
    placeFurniture('table', 'market-table', { x: 4.8, y: -3.5 }), placeFurniture('plant', 'market-plant', { x: 8.7, y: -2.4 }),
    placeFurniture('bench', 'fountain-bench-west', { x: -3.9, y: 0.8 }, { interaction: action('West fountain bench', 'A good place to watch the plaza.', 'Sit', 'sit', '⌁') }),
    placeFurniture('bench', 'fountain-bench-east', { x: 3.9, y: -0.8 }, { direction: 2, interaction: action('East fountain bench', 'Meet someone by the water.', 'Sit', 'sit', '⌁') }),
    placeFurniture('bench', 'garden-bench-a', { x: -7.3, y: 3.7 }, { interaction: action('Garden bench', 'A quiet seat under the plaza greenery.', 'Sit', 'sit', '⌁') }),
    placeFurniture('bench', 'garden-bench-b', { x: -5.7, y: 5.5 }, { direction: 2, interaction: action('Garden bench', 'A quiet seat under the plaza greenery.', 'Sit', 'sit', '⌁') }),
    placeFurniture('plant', 'garden-plant-a', { x: -9, y: 2 }), placeFurniture('plant', 'garden-plant-b', { x: -8, y: 5 }), placeFurniture('plant', 'garden-plant-c', { x: -6, y: 2 }),
    placeFurniture('communityBoard', 'community-board', { x: 7.5, y: 4.3 }, { interactionPoint: { x: 6.2, y: 4.1 }, interaction: action('Community Board', 'Open mic, maker swap, and gallery walk tonight.', 'Read events', 'inspect', '!') }),
    placeFurniture('sofa', 'community-sofa', { x: 5.1, y: 5.3 }, { interaction: action('Community sofa', 'A shared seat beside the events board.', 'Sit', 'sit', '⌁') }), placeFurniture('table', 'community-table', { x: 4.1, y: 3.8 }), placeFurniture('chair', 'community-chair', { x: 3.3, y: 4.4 }),
    placeFurniture('divider', 'gallery-entrance', { x: 8.4, y: 5 }, { interactionPoint: { x: 7, y: 5.1 }, interaction: action('Human Gallery', 'A room of original creator work.', 'Enter Gallery', 'enter-room', '↗', 'human-gallery') }),
    placeFurniture('divider', 'entry-left', { x: -2.4, y: 7.2 }), placeFurniture('divider', 'entry-right', { x: 2.4, y: 7.2 }, { direction: 2 }),
    placeFurniture('lamp', 'lamp-entry-a', { x: -3.8, y: 6.8 }, { ambient: 'glow' }), placeFurniture('lamp', 'lamp-entry-b', { x: 3.8, y: 6.8 }, { ambient: 'glow' }),
    placeFurniture('lamp', 'lamp-path-a', { x: -4.2, y: 2.8 }, { ambient: 'glow' }), placeFurniture('lamp', 'lamp-path-b', { x: 4.2, y: 2.8 }, { ambient: 'glow' }),
    placeFurniture('lamp', 'lamp-market', { x: 4.5, y: -5 }, { ambient: 'glow' }), placeFurniture('lamp', 'lamp-cafe', { x: -4.5, y: -5 }, { ambient: 'glow' }),
  ],
  avatars: [
    { id: 'player', name: 'You', position: { x: 0, y: 7 }, palette: palettes.player, appearance: appearances.player, player: true },
    npc('alex', 'Alex', { x: -6.4, y: -3.2 }, 'alex', [{ x: -6.4, y: -3.2 }, { x: -3.2, y: -1.4 }], ['Coffee is on me.', 'Welcome to the plaza!']),
    npc('iris', 'Iris', { x: -8.3, y: -1 }, 'sofia', [{ x: -8.3, y: -1 }, { x: -5.1, y: 0.4 }], ['Open mic later?']),
    npc('noor', 'Noor', { x: -2.5, y: -3.7 }, 'maya', [{ x: -2.5, y: -3.7 }, { x: -1.4, y: -1.5 }], ['The cafe terrace is cozy.']),
    npc('maya', 'Maya', { x: 0.8, y: 2.8 }, 'maya', [{ x: 0.8, y: 2.8 }, { x: -1.6, y: 1.8 }], ['Meet by the fountain?']),
    npc('diego', 'Diego', { x: 2.6, y: 1.8 }, 'alex', [{ x: 2.6, y: 1.8 }, { x: 1.4, y: -2.8 }], ['The plaza is buzzing.']),
    npc('hana', 'Hana', { x: -5.1, y: 4.4 }, 'maya', [{ x: -5.1, y: 4.4 }, { x: -2.2, y: 5.6 }], ['The garden path is my favorite.']),
    npc('sofia', 'Sofia', { x: -7.1, y: 5.1 }, 'sofia', undefined, ['I saved you a seat.']),
    npc('ravi', 'Ravi', { x: 1.4, y: 5.4 }, 'alex', [{ x: 1.4, y: 5.4 }, { x: -1.4, y: 4.1 }], ['Long walk from the entrance!']),
    npc('omar', 'Omar', { x: 5.1, y: -2.5 }, 'alex', [{ x: 5.1, y: -2.5 }, { x: 3.3, y: -0.8 }], ['Fresh market finds today!']),
    npc('june', 'June', { x: 8.1, y: -1 }, 'sofia', [{ x: 8.1, y: -1 }, { x: 5.2, y: 1.1 }], ['Want to browse?']),
    npc('ava', 'Ava', { x: 4.3, y: 4.9 }, 'maya', [{ x: 4.3, y: 4.9 }, { x: 2.1, y: 3.2 }], ['Events are on the board.']),
    npc('theo', 'Theo', { x: 7.1, y: 6 }, 'alex', [{ x: 7.1, y: 6 }, { x: 4.8, y: 6.1 }], ['Gallery walk starts soon.']),
    npc('leila', 'Leila', { x: -2.1, y: 0.3 }, 'maya', [{ x: -2.1, y: 0.3 }, { x: 2.2, y: 0.2 }], ['See you across the square!']),
  ],
};
