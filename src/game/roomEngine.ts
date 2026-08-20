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
  asset: string;
  category: RoomObjectCategory;
  position: IsoPoint;
  displayWidth: number;
  collision?: CollisionShape;
  interaction?: RoomInteraction;
  interactionPoint?: IsoPoint;
  depthBias?: number;
  ambient?: 'glow' | 'float';
}

export interface RoomAvatarDefinition {
  id: string;
  name: string;
  position: IsoPoint;
  palette: { skin: number; hair: number; outfit: number; accessory: number };
  appearance: AvatarAppearance;
  player?: boolean;
  patrol?: IsoPoint[];
}

export interface PlayerSpeech {
  id: number;
  text: string;
}

export interface RoomDefinition {
  id: string;
  name: string;
  floor: { assets: string[]; pathAssets: string[]; boundaryAsset: string; minX: number; maxX: number; minY: number; maxY: number };
  objects: RoomObjectDefinition[];
  avatars: RoomAvatarDefinition[];
  spawn: IsoPoint;
  ui: { subtitle: string; help: string };
}

export interface RoomSelection extends RoomInteraction {
  sourceId: string;
}
