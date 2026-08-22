import type { CollisionShape, IsoPoint } from './isometric';
import type { AvatarDirection } from './AvatarAnimationController';

export type RoomObjectCategory = 'building' | 'furniture' | 'prop' | 'vegetation' | 'landmark' | 'world-item';
export type InteractionAction = 'enter-room' | 'view-profile' | 'inspect' | 'sit' | 'use';
export type AvatarLayerSlot = 'body' | 'head' | 'face' | 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory';

export interface AvatarAppearance {
  frameColumns: number;
  frameRows: number;
  renderWidth: number;
  layers: { slot: AvatarLayerSlot; asset: string; tint?: number; alpha?: number }[];
}

export interface RoomInteraction {
  title: string;
  description: string;
  actionLabel: string;
  action: InteractionAction;
  targetId?: string;
  icon?: string;
  effect?: 'fountain-wish' | 'join-event' | 'read-events' | 'view-placement';
  facing?: AvatarDirection;
}

export interface RoomSeatDefinition {
  seatPosition: IsoPoint;
  approachPosition: IsoPoint;
  facing: 'north' | 'south' | 'east' | 'west';
  depthBias?: number;
  visualOffset?: number;
}

export interface RoomObjectDefinition {
  id: string;
  catalogId?: string;
  asset: string;
  category: RoomObjectCategory;
  position: IsoPoint;
  displayWidth: number;
  collision?: CollisionShape;
  interaction?: RoomInteraction;
  interactionPoint?: IsoPoint;
  depthBias?: number;
  ambient?: 'glow' | 'float' | 'sway';
  footprint?: { width: number; height: number };
  height?: number;
  anchor?: { x: number; y: number };
  direction?: number;
  state?: string;
  depthBase?: IsoPoint;
  spaceId?: string;
  content?: { eyebrow?: string; title: string; detail?: string; accent?: number };
  contentStates?: Record<string, { eyebrow?: string; title: string; detail?: string; accent?: number }>;
  seat?: RoomSeatDefinition;
}

export type RoomSpaceKind = 'event-stage' | 'rentable-shop' | 'ad-placement' | 'customizable-lounge';
export type RoomEditorCategory = 'seating' | 'tables' | 'plants' | 'lighting' | 'barriers' | 'commercial' | 'event' | 'social';

export interface RoomSpaceDefinition {
  id: string;
  kind: RoomSpaceKind;
  label: string;
  anchor: IsoPoint;
  bounds: { width: number; height: number };
  status: 'active-demo' | 'future-rentable' | 'future-customizable';
  allowedCatalogIds: string[];
  allowedCategories?: RoomEditorCategory[];
  editorTags: string[];
  ownerId: string | null;
  tenantId: string | null;
  floorMaterial: RoomMaterial;
  lifecycle: 'draft' | 'published';
}

export interface RoomEventDefinition {
  id: string;
  title: string;
  status: 'live' | 'scheduled' | 'ended';
  host: string;
  anchor: IsoPoint;
  objectIds: string[];
  music: { mode: 'replaceable-placeholder'; source: string | null };
}

export interface RoomDistrictDefinition {
  id: string;
  label: string;
  detail: string;
  anchor: IsoPoint;
  material: RoomMaterial;
}

export interface RoomAvatarDefinition {
  id: string;
  name: string;
  position: IsoPoint;
  palette: { skin: number; hair: number; outfit: number; accessory: number };
  appearance: AvatarAppearance;
  player?: boolean;
  patrol?: IsoPoint[];
  ambientSpeech?: string[];
  pose?: 'stand' | 'sit';
  depthBias?: number;
  activity?: string;
}

export type RoomMaterial = 'stone' | 'avenue' | 'fountain' | 'event' | 'shop' | 'cafe' | 'garden' | 'community' | 'entrance';
export type RoomBorderKind = 'curb' | 'fence' | 'wall';

export interface RoomCellDefinition {
  x: number;
  y: number;
  elevation: number;
  material: RoomMaterial;
  walkable: boolean;
}

export interface RoomWallDefinition {
  id: string;
  from: IsoPoint;
  to: IsoPoint;
  kind: RoomBorderKind;
  height: number;
  thickness?: number;
  blocksMovement?: boolean;
  color?: number;
  asset?: string;
  displayWidth?: number;
}

export interface RoomExitDefinition {
  id: string;
  position: IsoPoint;
  targetRoomId: string;
  label: string;
}

export interface RoomGeometryDefinition {
  cells: RoomCellDefinition[];
  walls: RoomWallDefinition[];
  exits: RoomExitDefinition[];
  spawn: IsoPoint;
  maxStepHeight: number;
}

export interface RoomFloorDefinition {
  materials: Record<RoomMaterial, string[]>;
}

export interface PlayerSpeech {
  id: number;
  text: string;
}

export interface RoomDefinition {
  id: string;
  name: string;
  geometry: RoomGeometryDefinition;
  floor: RoomFloorDefinition;
  objects: RoomObjectDefinition[];
  contextObjects?: RoomObjectDefinition[];
  avatars: RoomAvatarDefinition[];
  spaces?: RoomSpaceDefinition[];
  events?: RoomEventDefinition[];
  districts?: RoomDistrictDefinition[];
  studio: {
    formatVersion: 1;
    spaceId: string;
    ownerId: string | null;
    tenantId: string | null;
    lifecycle: 'draft' | 'published';
    allowedCategories: RoomEditorCategory[];
  };
  ui: { subtitle: string; help: string };
}

export interface RoomSelection extends RoomInteraction {
  sourceId: string;
}
