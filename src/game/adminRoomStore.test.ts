import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ROOM_UPDATED_EVENT,
  addCatalogObject,
  deleteRoomObject,
  importEditableRoom,
  loadEditableRoom,
  resetEditableRoom,
  saveEditableRoom,
  updateCatalogObject,
} from './adminRoomStore';
import { placeFurniture } from './furnitureCatalog';
import type { RoomDefinition } from './roomEngine';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function createRoom(): RoomDefinition {
  const bench = placeFurniture('bench', 'bench-1', { x: 1, y: 2 }, {
    interaction: {
      action: 'sit',
      actionLabel: 'Sit',
      description: 'A test bench',
      title: 'Bench',
    },
    interactionPoint: { x: 1.5, y: 2.5 },
  });
  const table = placeFurniture('table', 'table-1', { x: 5, y: 6 });
  return {
    avatars: [{
      appearance: { frameColumns: 1, frameRows: 1, layers: [], renderWidth: 32 },
      id: 'avatar-1',
      name: 'Alex',
      palette: { accessory: 0, hair: 0, outfit: 0, skin: 0 },
      position: { x: 0, y: 0 },
    }],
    events: [{
      anchor: { x: 1, y: 1 },
      host: 'Host',
      id: 'event-1',
      music: { mode: 'replaceable-placeholder', source: null },
      objectIds: ['bench-1', 'table-1'],
      status: 'scheduled',
      title: 'Test event',
    }],
    floor: {
      materials: {
        avenue: [], cafe: [], community: [], entrance: [], event: [], fountain: [], garden: [], shop: [], stone: [],
      },
    },
    geometry: {
      cells: [{ elevation: 0, material: 'stone', walkable: true, x: 0, y: 0 }],
      exits: [],
      maxStepHeight: 1,
      spawn: { x: 0, y: 0 },
      walls: [],
    },
    id: 'test-room',
    name: 'Test room',
    objects: [bench, table],
    studio: {
      allowedCategories: ['seating', 'tables'],
      formatVersion: 1,
      lifecycle: 'draft',
      ownerId: null,
      spaceId: 'test-space',
      tenantId: null,
    },
    ui: { help: 'Test help', subtitle: 'Test subtitle' },
  };
}

beforeEach(() => {
  const browserWindow = Object.assign(new EventTarget(), { localStorage: new MemoryStorage() });
  vi.stubGlobal('window', browserWindow);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('updateCatalogObject', () => {
  it('moves and rotates an object while rebuilding dependent metadata without mutation', () => {
    const source = createRoom();
    const original = structuredClone(source);
    const result = updateCatalogObject(source, 'bench-1', { direction: 2, position: { x: 4, y: 6 } });
    const bench = result.objects.find((object) => object.id === 'bench-1');

    expect(source).toEqual(original);
    expect(result).not.toBe(source);
    expect(bench?.position).toEqual({ x: 4, y: 6 });
    expect(bench?.direction).toBe(2);
    expect(bench?.collision).toMatchObject({ x: 4, y: 6 });
    expect(bench?.depthBase).toEqual({ x: 4, y: 6 });
    expect(bench?.seat).toMatchObject({
      approachPosition: { x: 4, y: 7.05 },
      facing: 'south',
      seatPosition: { x: 4, y: 6.38 },
    });
    expect(bench?.interactionPoint).toEqual({ x: 4.5, y: 6.5 });
    expect(bench?.interaction?.title).toBe('Bench');
  });
});

describe('addCatalogObject', () => {
  it('adds the requested item with a collision-safe unique ID and preserves the source', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const source = createRoom();
    const first = addCatalogObject(source, 'chair', { x: 7, y: 8 });
    const second = addCatalogObject(first, 'chair', { x: 9, y: 10 });

    expect(source.objects).toHaveLength(2);
    expect(first.objects).toHaveLength(3);
    expect(first.objects.slice(0, 2)).toEqual(source.objects);
    expect(first.objects[2]).toMatchObject({ catalogId: 'chair', position: { x: 7, y: 8 } });
    expect(second.objects[3]?.id).not.toBe(first.objects[2]?.id);
    expect(new Set(second.objects.map(({ id }) => id)).size).toBe(second.objects.length);
  });
});

describe('deleteRoomObject', () => {
  it('removes only the requested object and its event references without mutation', () => {
    const source = createRoom();
    const original = structuredClone(source);
    const result = deleteRoomObject(source, 'bench-1');

    expect(source).toEqual(original);
    expect(result.objects.map(({ id }) => id)).toEqual(['table-1']);
    expect(result.events?.[0]?.objectIds).toEqual(['table-1']);
  });
});

describe('importEditableRoom', () => {
  it('accepts a valid room definition', () => {
    const source = createRoom();
    expect(importEditableRoom(JSON.stringify(source), source.id)).toEqual(source);
  });

  it('rejects the wrong room ID or missing required room collections', () => {
    const source = createRoom();
    expect(() => importEditableRoom(JSON.stringify(source), 'another-room')).toThrow('Expected room id');
    expect(() => importEditableRoom(JSON.stringify({ ...source, geometry: undefined }), source.id)).toThrow('geometry');
    expect(() => importEditableRoom(JSON.stringify({ ...source, objects: undefined }), source.id)).toThrow('objects or avatars');
    expect(() => importEditableRoom(JSON.stringify({ ...source, avatars: undefined }), source.id)).toThrow('objects or avatars');
  });
});

describe('save, load, and reset', () => {
  it('round-trips the same room, emits the correct room ID, and removes the override', () => {
    const source = createRoom();
    const edited = updateCatalogObject(source, 'table-1', { position: { x: 10, y: 11 } });
    const updatedRoomIds: string[] = [];
    window.addEventListener(ROOM_UPDATED_EVENT, (event) => {
      updatedRoomIds.push((event as CustomEvent<{ roomId: string }>).detail.roomId);
    });

    saveEditableRoom(edited);
    expect(loadEditableRoom(source)).toEqual(edited);
    expect(updatedRoomIds).toEqual(['test-room']);

    const reset = resetEditableRoom(source);
    expect(reset).toEqual(source);
    expect(reset).not.toBe(source);
    expect(loadEditableRoom(source)).toEqual(source);
    expect(updatedRoomIds).toEqual(['test-room', 'test-room']);
  });
});
