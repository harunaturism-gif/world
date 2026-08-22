import type { RoomDefinition, RoomEditorCategory, RoomMaterial, RoomObjectDefinition, RoomSpaceKind } from './roomEngine';

export interface StudioPlacedObject {
  id: string;
  catalogId: string | null;
  asset: string;
  position: { x: number; y: number; z?: number };
  rotation: number;
  state: string | null;
}

export interface StudioSpaceSnapshot {
  spaceId: string;
  ownerId: string | null;
  tenantId: string | null;
  type: RoomSpaceKind;
  bounds: { anchor: { x: number; y: number; z?: number }; width: number; height: number };
  floorMaterial: RoomMaterial;
  placedObjects: StudioPlacedObject[];
  allowedCategories: RoomEditorCategory[];
  musicEventConfig: RoomDefinition['events'];
  lifecycle: 'draft' | 'published';
}

const serializeObject = (object: RoomObjectDefinition): StudioPlacedObject => ({
  id: object.id,
  catalogId: object.catalogId ?? null,
  asset: object.asset,
  position: { ...object.position },
  rotation: object.direction ?? 0,
  state: object.state ?? null,
});

/** The future Studio consumes the same room JSON: geometry → floor → spaces → furniture → actors → events → renderer. */
export function serializeRoomSpaces(room: RoomDefinition): StudioSpaceSnapshot[] {
  return (room.spaces ?? []).map((space) => ({
    spaceId: space.id,
    ownerId: space.ownerId,
    tenantId: space.tenantId,
    type: space.kind,
    bounds: { anchor: { ...space.anchor }, ...space.bounds },
    floorMaterial: space.floorMaterial,
    placedObjects: room.objects.filter((object) => object.spaceId === space.id).map(serializeObject),
    allowedCategories: space.allowedCategories ?? [],
    musicEventConfig: room.events?.filter((event) => event.objectIds.some((id) => room.objects.some((object) => object.id === id && object.spaceId === space.id))),
    lifecycle: space.lifecycle,
  }));
}
