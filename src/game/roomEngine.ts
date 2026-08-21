import type { CollisionShape, IsoPoint } from './isometric';

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
}

export type RoomMaterial = 'stone' | 'path' | 'garden' | 'platform';
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
  avatars: RoomAvatarDefinition[];
  ui: { subtitle: string; help: string };
}

export interface RoomSelection extends RoomInteraction {
  sourceId: string;
}
