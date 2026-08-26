import { furnitureCatalog, placeFurniture, type FurnitureId } from './furnitureCatalog';
import type { IsoPoint } from './isometric';
import type { RoomDefinition, RoomObjectDefinition } from './roomEngine';
import { useDevelopmentAdmin } from '../services/AdminService';

const ROOM_STORAGE_PREFIX = 'human-world:admin:room:';
export const ROOM_UPDATED_EVENT = 'human-world:room-updated';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function roomStorageKey(roomId: string) {
  return `${ROOM_STORAGE_PREFIX}${roomId}`;
}

export function notifyRoomUpdated(roomId: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ROOM_UPDATED_EVENT, { detail: { roomId } }));
}

export function loadEditableRoom(baseRoom: RoomDefinition): RoomDefinition {
  const fallback = clone(baseRoom);
  if (!useDevelopmentAdmin || typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(roomStorageKey(baseRoom.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as RoomDefinition;
    if (parsed.id !== baseRoom.id || !parsed.geometry || !Array.isArray(parsed.objects)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveEditableRoom(room: RoomDefinition) {
  if (!useDevelopmentAdmin || typeof window === 'undefined') return;
  window.localStorage.setItem(roomStorageKey(room.id), JSON.stringify(room));
  notifyRoomUpdated(room.id);
}

export function resetEditableRoom(baseRoom: RoomDefinition): RoomDefinition {
  if (useDevelopmentAdmin && typeof window !== 'undefined') {
    window.localStorage.removeItem(roomStorageKey(baseRoom.id));
    notifyRoomUpdated(baseRoom.id);
  }
  return clone(baseRoom);
}

export function exportEditableRoom(room: RoomDefinition) {
  return JSON.stringify(room, null, 2);
}

export function importEditableRoom(raw: string, expectedRoomId: string): RoomDefinition {
  const parsed = JSON.parse(raw) as RoomDefinition;
  if (parsed.id !== expectedRoomId) throw new Error(`Expected room id ${expectedRoomId}.`);
  if (!parsed.geometry || !Array.isArray(parsed.geometry.cells)) throw new Error('Room geometry is missing.');
  if (!Array.isArray(parsed.objects) || !Array.isArray(parsed.avatars)) throw new Error('Room objects or avatars are missing.');
  return parsed;
}

function movePoint(point: IsoPoint | undefined, dx: number, dy: number) {
  if (!point) return undefined;
  return { ...point, x: point.x + dx, y: point.y + dy };
}

function isFurnitureId(value: string | undefined): value is FurnitureId {
  return Boolean(value && value in furnitureCatalog);
}

export function updateCatalogObject(
  sourceRoom: RoomDefinition,
  objectId: string,
  patch: { position?: IsoPoint; direction?: number; state?: string },
): RoomDefinition {
  const room = clone(sourceRoom);
  const index = room.objects.findIndex((object) => object.id === objectId);
  if (index < 0) return room;

  const current = room.objects[index];
  if (!isFurnitureId(current.catalogId)) {
    room.objects[index] = { ...current, ...patch, position: patch.position ?? current.position };
    return room;
  }

  const nextPosition = patch.position ?? current.position;
  const dx = nextPosition.x - current.position.x;
  const dy = nextPosition.y - current.position.y;
  const rebuilt = placeFurniture(current.catalogId, current.id, nextPosition, {
    direction: patch.direction ?? current.direction,
    state: patch.state ?? current.state,
    ambient: current.ambient,
    depthBias: current.depthBias,
    spaceId: current.spaceId,
    content: current.content,
    contentStates: current.contentStates,
    interaction: current.interaction,
    interactionPoint: movePoint(current.interactionPoint, dx, dy),
  });

  room.objects[index] = rebuilt;
  return room;
}

export function deleteRoomObject(sourceRoom: RoomDefinition, objectId: string): RoomDefinition {
  const room = clone(sourceRoom);
  room.objects = room.objects.filter((object) => object.id !== objectId);
  room.events = room.events?.map((event) => ({
    ...event,
    objectIds: event.objectIds.filter((id) => id !== objectId),
  }));
  return room;
}

export function addCatalogObject(sourceRoom: RoomDefinition, catalogId: FurnitureId, position: IsoPoint): RoomDefinition {
  const room = clone(sourceRoom);
  const definition = furnitureCatalog[catalogId];
  const uniqueId = `${definition.id}-admin-${Date.now().toString(36)}`;
  const object: RoomObjectDefinition = placeFurniture(catalogId, uniqueId, position);
  room.objects.push(object);
  return room;
}
