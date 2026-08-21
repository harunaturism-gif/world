import { placeFurniture } from './furnitureCatalog';
import type { AvatarAppearance, RoomAvatarDefinition, RoomCellDefinition, RoomDefinition, RoomGeometryDefinition, RoomInteraction } from './roomEngine';

const groundRoot = '/assets/world/ground';
const socialRoot = '/assets/world/social-room/characters';
const characterRoot = '/assets/world/characters';

export const worldAssets = {
  ground: `${groundRoot}/plaza-stone-a.svg`, groundVariant: `${groundRoot}/plaza-stone-b.svg`, path: `${groundRoot}/plaza-path.svg`, garden: `${groundRoot}/garden-tile.svg`, platform: `${groundRoot}/platform-tile.svg`,
  avatarShadow: `${characterRoot}/avatar-shadow.svg`,
  playerAtlas: `${socialRoot}/player-atlas.png`, alexAtlas: `${socialRoot}/alex-atlas.png`, mayaAtlas: `${socialRoot}/maya-atlas.png`, sofiaAtlas: `${socialRoot}/sofia-atlas.png`,
  alexVariant: `${characterRoot}/alex-avatar-atlas.png`, mayaVariant: `${characterRoot}/maya-avatar-atlas.png`, sofiaVariant: `${characterRoot}/sofia-avatar-atlas.png`, playerVariant: `${characterRoot}/human-world-avatar-atlas.png`,
} as const;

const atlasAppearance = (asset: string, renderWidth = 80): AvatarAppearance => ({ frameColumns: 4, frameRows: 4, renderWidth, layers: [{ slot: 'body', asset }] });
const appearances = {
  player: atlasAppearance(worldAssets.playerAtlas, 78), alex: atlasAppearance(worldAssets.alexAtlas), maya: atlasAppearance(worldAssets.mayaAtlas), sofia: atlasAppearance(worldAssets.sofiaAtlas),
  alexAlt: atlasAppearance(worldAssets.alexVariant, 78), mayaAlt: atlasAppearance(worldAssets.mayaVariant, 78), sofiaAlt: atlasAppearance(worldAssets.sofiaVariant, 78), creator: atlasAppearance(worldAssets.playerVariant, 78),
};
const palettes = {
  player: { skin: 0xf2b78d, hair: 0x8f3322, outfit: 0x315db3, accessory: 0xf1bd55 }, alex: { skin: 0x7c4328, hair: 0x211713, outfit: 0x28755d, accessory: 0xe4a83f },
  maya: { skin: 0xb86e43, hair: 0x171a25, outfit: 0xe45f59, accessory: 0xf1bd55 }, sofia: { skin: 0xd99a6b, hair: 0xbab1cf, outfit: 0x4c568b, accessory: 0x2f8780 },
};

function createPlazaGeometry(): RoomGeometryDefinition {
  const cells: RoomCellDefinition[] = [];
  for (let y = -8; y <= 9; y += 1) for (let x = -12; x <= 11; x += 1) {
    const cornerCut = (Math.abs(y) >= 8 && (x < -9 || x > 9)) || (y === 7 && (x < -11 || x > 10));
    if (cornerCut) continue;
    const fountainSquare = x >= -2 && x <= 4 && y >= -3 && y <= 3;
    const stageTerrace = x >= -8 && x <= -3 && y <= -3;
    const shopPromenade = x >= 5 && y <= -2;
    const gardenLounge = x <= -5 && y >= 2;
    const communityTerrace = x >= 5 && y >= 4;
    const mainAvenue = Math.abs(x - 1) <= 1 || Math.abs(y) <= 1 || y >= 7;
    const material = fountainSquare || stageTerrace ? 'platform' : gardenLounge ? 'garden' : shopPromenade || communityTerrace || mainAvenue ? 'path' : 'stone';
    const ornamental = gardenLounge && x <= -10 && (x + y) % 2 === 0;
    cells.push({ x, y, elevation: fountainSquare || stageTerrace ? 0.25 : 0, material, walkable: !ornamental });
  }
  return {
    cells, spawn: { x: 1, y: 8 }, maxStepHeight: 0.35,
    exits: [
      { id: 'arrival-gate', position: { x: 1, y: 9 }, targetRoomId: 'world-map', label: 'World entrance' },
      { id: 'cafe-door', position: { x: -10, y: -5.2 }, targetRoomId: 'lunas-cafe', label: "Luna's Cafe" },
      { id: 'gallery-door', position: { x: 9, y: 6 }, targetRoomId: 'human-gallery', label: 'Human Gallery' },
    ],
    walls: [
      { id: 'stage-rail', from: { x: -8.8, y: -7 }, to: { x: -3, y: -7 }, kind: 'curb', height: 28, thickness: 0.12, blocksMovement: true, color: 0x284d58 },
      { id: 'shop-rail', from: { x: 4.6, y: -7 }, to: { x: 10, y: -7 }, kind: 'curb', height: 28, thickness: 0.12, blocksMovement: true, color: 0x8d5f4c },
    ],
  };
}

const action = (title: string, description: string, actionLabel: string, type: RoomInteraction['action'], icon: string, targetId?: string): RoomInteraction => ({ title, description, actionLabel, action: type, icon, targetId });
type AppearanceKey = keyof typeof appearances;
const resident = (id: string, name: string, position: { x: number; y: number }, appearance: AppearanceKey, activity: string, patrol: { x: number; y: number }[] | undefined, speech: string[], pose?: 'stand' | 'sit'): RoomAvatarDefinition => ({ id, name, position, appearance: appearances[appearance], palette: appearance.includes('maya') ? palettes.maya : appearance.includes('sofia') ? palettes.sofia : appearance === 'player' || appearance === 'creator' ? palettes.player : palettes.alex, activity, patrol, ambientSpeech: speech, pose });

export const centralPlazaRoom: RoomDefinition = {
  id: 'central-plaza', name: 'Central Plaza', geometry: createPlazaGeometry(),
  floor: { materials: { stone: [worldAssets.ground, worldAssets.groundVariant], path: [worldAssets.path], garden: [worldAssets.garden], platform: [worldAssets.platform] } },
  ui: { subtitle: 'Central Plaza · Live now · 18 humans', help: 'Tap to walk · drag to explore · pinch or +/− to zoom · WASD / arrows' },
  spaces: [
    { id: 'live-stage-slot', kind: 'event-stage', label: 'Central Sessions Stage', anchor: { x: -5.8, y: -5.2 }, bounds: { width: 5, height: 3 }, status: 'active-demo', allowedCatalogIds: ['dj-stage', 'lamp', 'divider'], editorTags: ['music', 'event', 'scheduled'] },
    { id: 'shop-a-slot', kind: 'rentable-shop', label: 'Promenade Shop A', anchor: { x: 6.2, y: -5.3 }, bounds: { width: 3, height: 2 }, status: 'future-rentable', allowedCatalogIds: ['rentable-storefront', 'market-stall', 'table', 'plant'], editorTags: ['commerce', 'creator', 'rentable'] },
    { id: 'shop-b-slot', kind: 'rentable-shop', label: 'Promenade Shop B', anchor: { x: 9.5, y: -2.7 }, bounds: { width: 3, height: 2 }, status: 'future-rentable', allowedCatalogIds: ['rentable-storefront', 'market-stall', 'table'], editorTags: ['commerce', 'rentable', 'featured'] },
    { id: 'billboard-east-slot', kind: 'ad-placement', label: 'East Plaza Screen', anchor: { x: 9.5, y: 1.2 }, bounds: { width: 3, height: 1 }, status: 'future-rentable', allowedCatalogIds: ['digital-billboard'], editorTags: ['campaign', 'placement', 'outdoor'] },
    { id: 'garden-pavilion-slot', kind: 'customizable-lounge', label: 'Garden Pavilion', anchor: { x: -8, y: 4.7 }, bounds: { width: 4, height: 4 }, status: 'future-customizable', allowedCatalogIds: ['event-canopy', 'sofa', 'table', 'chair', 'plant'], editorTags: ['social', 'player-space', 'event'] },
  ],
  objects: [
    placeFurniture('fountain', 'fountain', { x: 1, y: 0 }, { ambient: 'glow', interactionPoint: { x: 1, y: 2.1 }, interaction: action('Human Fountain', 'The luminous heart of Central Plaza.', 'Make a wish', 'use', '◆') }),
    placeFurniture('djStage', 'dj-stage', { x: -5.8, y: -5.2 }, { spaceId: 'live-stage-slot', state: 'live', ambient: 'glow', interactionPoint: { x: -5.2, y: -2.9 }, interaction: action('Central Sessions', 'A live neighborhood DJ set is underway.', 'Join the crowd', 'inspect', '♫') }),
    placeFurniture('cafeCounter', 'cafe-counter', { x: -10.1, y: -5.3 }, { interactionPoint: { x: -9.3, y: -3.7 }, interaction: action("Luna's Cafe", 'Coffee, conversation, and a quieter room inside.', 'Enter Cafe', 'enter-room', '☕', 'lunas-cafe') }),
    placeFurniture('rentableStorefront', 'rentable-shop-a', { x: 6.2, y: -5.3 }, { spaceId: 'shop-a-slot', state: 'available', interactionPoint: { x: 5.5, y: -3.5 }, interaction: action('Promenade Shop A', 'A future creator-run storefront prepared for rental.', 'Preview space', 'inspect', '◇') }),
    placeFurniture('rentableStorefront', 'rentable-shop-b', { x: 9.3, y: -2.7 }, { spaceId: 'shop-b-slot', direction: 2, state: 'available', interactionPoint: { x: 7.8, y: -1.8 }, interaction: action('Promenade Shop B', 'A customizable retail slot facing the main square.', 'Preview space', 'inspect', '◇') }),
    placeFurniture('marketStall', 'maker-market', { x: 5.1, y: -1.9 }, { ambient: 'sway', interactionPoint: { x: 4.7, y: -0.3 }, interaction: action('Maker Market', 'Original items from local creators.', 'Browse stalls', 'inspect', '✦') }),
    placeFurniture('digitalBillboard', 'east-billboard', { x: 9.2, y: 1.4 }, { spaceId: 'billboard-east-slot', state: 'community', ambient: 'glow', interactionPoint: { x: 7.5, y: 1.9 }, interaction: action('East Plaza Screen', 'Community events today; future campaigns can reserve this placement.', 'View placement', 'inspect', '▣') }),
    placeFurniture('eventCanopy', 'garden-pavilion', { x: -8, y: 4.7 }, { spaceId: 'garden-pavilion-slot', ambient: 'glow', interactionPoint: { x: -6.1, y: 4.2 }, interaction: action('Garden Pavilion', 'A reservable social lounge for meetups and creator events.', 'Explore pavilion', 'inspect', '✺') }),
    placeFurniture('communityBoard', 'community-board', { x: 8.2, y: 5.8 }, { interactionPoint: { x: 6.8, y: 5.7 }, interaction: action('What’s On', 'DJ set now · creator meetup next · gallery walk tonight.', 'Open schedule', 'inspect', '!') }),
    placeFurniture('divider', 'gallery-entrance', { x: 10, y: 6.4 }, { interactionPoint: { x: 8.6, y: 6.2 }, interaction: action('Human Gallery', 'Original work from Human World creators.', 'Enter Gallery', 'enter-room', '↗', 'human-gallery') }),

    placeFurniture('table', 'cafe-table-a', { x: -10.2, y: -2.4 }), placeFurniture('chair', 'cafe-chair-a', { x: -11, y: -1.9 }), placeFurniture('chair', 'cafe-chair-b', { x: -9.4, y: -2.9 }, { direction: 2 }),
    placeFurniture('bench', 'stage-bench', { x: -2.4, y: -4.5 }, { direction: 2, interaction: action('Stage-side bench', 'Take in the set without joining the dance floor.', 'Sit', 'sit', '⌁') }),
    placeFurniture('bench', 'fountain-bench-west', { x: -2.8, y: 1 }, { interaction: action('Fountain bench', 'A perfect people-watching spot.', 'Sit', 'sit', '⌁') }),
    placeFurniture('bench', 'fountain-bench-east', { x: 4.8, y: -0.8 }, { direction: 2, interaction: action('Fountain bench', 'Meet someone by the water.', 'Sit', 'sit', '⌁') }),
    placeFurniture('bench', 'garden-bench', { x: -4.7, y: 5.6 }, { direction: 2, interaction: action('Garden bench', 'A calm edge of the busy plaza.', 'Sit', 'sit', '⌁') }),
    placeFurniture('sofa', 'community-sofa', { x: 5.7, y: 6.1 }, { interaction: action('Community sofa', 'A shared seat by the event board.', 'Sit', 'sit', '⌁') }),
    placeFurniture('table', 'community-table', { x: 4.9, y: 4.6 }), placeFurniture('chair', 'community-chair-a', { x: 3.9, y: 5.2 }), placeFurniture('chair', 'community-chair-b', { x: 5.9, y: 3.9 }, { direction: 2 }),

    placeFurniture('plant', 'garden-plant-a', { x: -11, y: 2 }), placeFurniture('plant', 'garden-plant-b', { x: -10, y: 6.5 }), placeFurniture('plant', 'garden-plant-c', { x: -5.2, y: 3.1 }), placeFurniture('plant', 'shop-plant', { x: 10.7, y: -5.5 }),
    placeFurniture('lamp', 'lamp-entry-a', { x: -1.8, y: 7.8 }, { ambient: 'glow' }), placeFurniture('lamp', 'lamp-entry-b', { x: 3.8, y: 7.8 }, { ambient: 'glow' }),
    placeFurniture('lamp', 'lamp-stage-a', { x: -8.7, y: -3.2 }, { ambient: 'glow' }), placeFurniture('lamp', 'lamp-stage-b', { x: -2.8, y: -2.8 }, { ambient: 'glow' }),
    placeFurniture('lamp', 'lamp-square-a', { x: -3.5, y: 3.2 }, { ambient: 'glow' }), placeFurniture('lamp', 'lamp-square-b', { x: 5.3, y: 3.2 }, { ambient: 'glow' }),
    placeFurniture('divider', 'entry-left', { x: -1.6, y: 8.2 }), placeFurniture('divider', 'entry-right', { x: 3.6, y: 8.2 }, { direction: 2 }),
  ],
  avatars: [
    { id: 'player', name: 'You', position: { x: 1, y: 8 }, palette: palettes.player, appearance: appearances.player, player: true, activity: 'Exploring Central Plaza' },
    resident('dj-nova', 'Nova', { x: -5.4, y: -3 }, 'sofia', 'DJing Central Sessions', undefined, ['Central Plaza, make some noise!', 'This next track is for the newcomers.']),
    resident('alex', 'Alex', { x: -7.8, y: -2.1 }, 'alex', 'Dancing by the stage', [{ x: -7.8, y: -2.1 }, { x: -6.9, y: -1.4 }], ['This set is unreal.']),
    resident('zuri', 'Zuri', { x: -5.8, y: -1.5 }, 'mayaAlt', 'Dancing with friends', [{ x: -5.8, y: -1.5 }, { x: -4.7, y: -2.1 }], ['Join us!']),
    resident('nico', 'Nico', { x: -3.7, y: -2.2 }, 'creator', 'Watching the live set', undefined, ['Nova always brings the crowd.']),
    resident('iris', 'Iris', { x: -9.2, y: -3.2 }, 'sofiaAlt', 'Meeting outside the cafe', [{ x: -9.2, y: -3.2 }, { x: -8.2, y: -1.2 }], ['Coffee after the set?']),
    resident('noor', 'Noor', { x: -10.4, y: -1.2 }, 'maya', 'Chatting at Luna’s terrace', undefined, ['The terrace is perfect tonight.']),
    resident('maya', 'Maya', { x: -0.8, y: 2.6 }, 'mayaAlt', 'Meeting by the fountain', [{ x: -0.8, y: 2.6 }, { x: 0.3, y: 3.6 }], ['Meet by the fountain?']),
    resident('diego', 'Diego', { x: 3.3, y: 2.3 }, 'alex', 'Taking plaza photos', [{ x: 3.3, y: 2.3 }, { x: 2, y: 3.8 }], ['The lights look great from here.']),
    resident('leila', 'Leila', { x: 2.6, y: -2.4 }, 'maya', 'Watching the fountain', [{ x: 2.6, y: -2.4 }, { x: 3.6, y: -3 }], ['The square finally feels alive.']),
    resident('omar', 'Omar', { x: 5.7, y: -0.1 }, 'alexAlt', 'Browsing the maker market', [{ x: 5.7, y: -0.1 }, { x: 7, y: -1 }], ['Fresh creator drops today.']),
    resident('june', 'June', { x: 7.5, y: -2.3 }, 'sofia', 'Previewing a storefront', undefined, ['I could run a flower shop here.']),
    resident('mina', 'Mina', { x: 9.6, y: -0.3 }, 'sofiaAlt', 'Planning a pop-up', [{ x: 9.6, y: -0.3 }, { x: 7.8, y: 0.7 }], ['This promenade has real potential.']),
    resident('hana', 'Hana', { x: -6.1, y: 5.3 }, 'maya', 'Hosting a garden meetup', undefined, ['Welcome to the pavilion meetup!']),
    resident('sofia', 'Sofia', { x: -4.8, y: 4.5 }, 'sofiaAlt', 'Relaxing in the garden', undefined, ['It’s quieter over here.']),
    resident('ravi', 'Ravi', { x: -1.2, y: 5.7 }, 'alexAlt', 'Walking the south promenade', [{ x: -1.2, y: 5.7 }, { x: 2.3, y: 6.1 }], ['Every district has its own vibe.']),
    resident('ava', 'Ava', { x: 5.2, y: 5.1 }, 'mayaAlt', 'Checking tonight’s schedule', undefined, ['Gallery walk at eight!']),
    resident('theo', 'Theo', { x: 7.4, y: 6.6 }, 'creator', 'Heading to the gallery', [{ x: 7.4, y: 6.6 }, { x: 4.7, y: 7 }], ['See you inside the gallery.']),
  ],
};
