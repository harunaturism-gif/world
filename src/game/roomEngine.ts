import type { CollisionShape, IsoPoint } from './isometric';

export type RoomObjectCategory = 'building' | 'furniture' | 'prop' | 'vegetation' | 'landmark' | 'world-item';
export type InteractionAction = 'enter-room' | 'view-profile' | 'inspect' | 'sit' | 'use';

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
  depthBias?: number;
  ambient?: 'glow' | 'float';
}

export interface RoomAvatarDefinition {
  id: string;
  name: string;
  position: IsoPoint;
  tint: number;
  player?: boolean;
}

export interface RoomDefinition {
  id: string;
  name: string;
  floor: { asset: string; boundaryAsset: string; minX: number; maxX: number; minY: number; maxY: number };
  objects: RoomObjectDefinition[];
  avatars: RoomAvatarDefinition[];
  spawn: IsoPoint;
  ui: { subtitle: string; help: string };
}

export interface RoomSelection extends RoomInteraction {
  sourceId: string;
}
