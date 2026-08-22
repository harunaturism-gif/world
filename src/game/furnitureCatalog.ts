import type { IsoPoint } from './isometric';
import type { RoomEditorCategory, RoomInteraction, RoomObjectCategory, RoomObjectDefinition } from './roomEngine';
import { WORLD_SCALE } from './worldScale';

export type FurnitureId = keyof typeof furnitureCatalog;

export interface FurnitureDefinition {
  id: string;
  asset: string;
  category: RoomObjectCategory;
  footprint: readonly [number, number];
  height: number;
  displayWidth: number;
  anchor: readonly [number, number];
  collision: 'solid' | 'passable';
  depthBase: readonly [number, number];
  directions: readonly number[];
  states?: readonly string[];
  editorCategory: RoomEditorCategory;
}

const root = '/assets/world/open-hotel-port/furniture';

export const furnitureCatalog = {
  bench: { id: 'bench', asset: `${root}/bench.png`, category: 'furniture', editorCategory: 'seating', ...WORLD_SCALE.furniture.bench, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2], states: ['empty', 'occupied'] },
  chair: { id: 'chair', asset: `${root}/chair.png`, category: 'furniture', editorCategory: 'seating', ...WORLD_SCALE.furniture.chair, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2], states: ['empty', 'occupied'] },
  stool: { id: 'stool', asset: `${root}/stool.png`, category: 'furniture', editorCategory: 'seating', ...WORLD_SCALE.furniture.stool, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2], states: ['empty', 'occupied'] },
  table: { id: 'table', asset: `${root}/table.png`, category: 'furniture', editorCategory: 'tables', ...WORLD_SCALE.furniture.table, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0] },
  sideTable: { id: 'side-table', asset: `${root}/side-table.png`, category: 'furniture', editorCategory: 'tables', ...WORLD_SCALE.furniture.sideTable, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0] },
  sofa: { id: 'sofa', asset: `${root}/sofa.png`, category: 'furniture', editorCategory: 'seating', ...WORLD_SCALE.furniture.sofa, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2], states: ['empty', 'occupied'] },
  lamp: { id: 'lamp', asset: `${root}/lamp.png`, category: 'prop', editorCategory: 'lighting', ...WORLD_SCALE.furniture.lamp, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0], states: ['on'] },
  eventLight: { id: 'event-light', asset: `${root}/event-light.png`, category: 'prop', editorCategory: 'lighting', ...WORLD_SCALE.furniture.eventLight, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0], states: ['on', 'off'] },
  plant: { id: 'plant', asset: `${root}/plant.png`, category: 'vegetation', editorCategory: 'plants', ...WORLD_SCALE.furniture.plant, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0] },
  tallPlant: { id: 'tall-plant', asset: `${root}/tall-plant.png`, category: 'vegetation', editorCategory: 'plants', ...WORLD_SCALE.furniture.tallPlant, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0] },
  flowerPlanter: { id: 'flower-planter', asset: `${root}/flower-planter.png`, category: 'vegetation', editorCategory: 'plants', ...WORLD_SCALE.furniture.flowerPlanter, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2] },
  communityBoard: { id: 'community-board', asset: `${root}/community-board.png`, category: 'world-item', editorCategory: 'social', ...WORLD_SCALE.furniture.communityBoard, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2] },
  cafeCounter: { id: 'cafe-counter', asset: `${root}/cafe-counter.png`, category: 'building', editorCategory: 'commercial', ...WORLD_SCALE.furniture.cafeCounter, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0] },
  marketStall: { id: 'market-stall', asset: `${root}/market-stall.png`, category: 'building', editorCategory: 'commercial', ...WORLD_SCALE.furniture.marketStall, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0] },
  fountain: { id: 'fountain', asset: `${root}/fountain.png`, category: 'landmark', editorCategory: 'social', ...WORLD_SCALE.furniture.fountain, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0], states: ['flowing'] },
  divider: { id: 'divider', asset: `${root}/divider.png`, category: 'prop', editorCategory: 'barriers', ...WORLD_SCALE.furniture.divider, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2] },
  ropeBarrier: { id: 'rope-barrier', asset: `${root}/rope-barrier.png`, category: 'prop', editorCategory: 'barriers', ...WORLD_SCALE.furniture.ropeBarrier, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2] },
  djStage: { id: 'dj-stage', asset: `${root}/dj-stage.png`, category: 'landmark', editorCategory: 'event', ...WORLD_SCALE.furniture.djStage, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0.35], directions: [0], states: ['live', 'idle'] },
  speaker: { id: 'speaker', asset: `${root}/speaker.png`, category: 'prop', editorCategory: 'event', ...WORLD_SCALE.furniture.speaker, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2], states: ['live', 'idle'] },
  rentableStorefront: { id: 'rentable-storefront', asset: `${root}/rentable-storefront.png`, category: 'building', editorCategory: 'commercial', ...WORLD_SCALE.furniture.rentableStorefront, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0.2], directions: [0, 2], states: ['available', 'occupied'] },
  digitalBillboard: { id: 'digital-billboard', asset: `${root}/digital-billboard.png`, category: 'world-item', editorCategory: 'commercial', ...WORLD_SCALE.furniture.digitalBillboard, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2], states: ['event', 'creator', 'available'] },
  displayStand: { id: 'display-stand', asset: `${root}/display-stand.png`, category: 'world-item', editorCategory: 'commercial', ...WORLD_SCALE.furniture.displayStand, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0], directions: [0, 2], states: ['featured', 'empty'] },
  eventCanopy: { id: 'event-canopy', asset: `${root}/event-canopy.png`, category: 'building', editorCategory: 'event', ...WORLD_SCALE.furniture.eventCanopy, anchor: [0.5, 1], collision: 'solid', depthBase: [0, 0.45], directions: [0], states: ['open', 'reserved'] },
} as const satisfies Record<string, FurnitureDefinition>;

export function placeFurniture(
  catalogId: FurnitureId,
  id: string,
  position: IsoPoint,
  options: { interaction?: RoomInteraction; interactionPoint?: IsoPoint; direction?: number; state?: string; ambient?: RoomObjectDefinition['ambient']; depthBias?: number; spaceId?: string; content?: RoomObjectDefinition['content']; contentStates?: RoomObjectDefinition['contentStates'] } = {},
): RoomObjectDefinition {
  const definition = furnitureCatalog[catalogId];
  const [width, height] = definition.footprint;
  return {
    id,
    catalogId,
    asset: definition.asset,
    category: definition.category,
    position,
    displayWidth: definition.displayWidth,
    footprint: { width, height },
    height: definition.height,
    anchor: { x: definition.anchor[0], y: definition.anchor[1] },
    direction: options.direction ?? definition.directions[0],
    state: options.state ?? ('states' in definition ? definition.states[0] : undefined),
    collision: definition.collision === 'solid' ? { kind: 'rect', x: position.x, y: position.y, width: width * 0.86, height: height * 0.86 } : undefined,
    depthBase: { x: position.x + definition.depthBase[0], y: position.y + definition.depthBase[1] },
    ...options,
  };
}
