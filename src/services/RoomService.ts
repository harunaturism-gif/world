import { persistenceRequest, useDevelopmentPersistence } from './persistenceApi';
import type { RoomDefinition } from '../game/roomEngine';
import { useDevelopmentAdmin } from './AdminService';

export const ROOM_MAP_UPDATED_EVENT = 'human-world:map-updated';
const ROOM_META_STORAGE_KEY = 'human-world:admin:room-meta:v1';
export type LandStatus = 'public' | 'available' | 'owned' | 'reserved';

export interface RoomData {
  id: string; name: string; owner_id: string | null; type: string; capacity: number;
  is_public: boolean; created_at: string; top: string; left: string; presence?: number;
  land_status?: LandStatus; price_hum?: number | null;
}

export const demoRooms: RoomData[] = [
  { id: 'central-plaza', name: 'Central Plaza', type: 'plaza', capacity: 50, owner_id: null, is_public: true, created_at: '', top: '48%', left: '50%', presence: 5, land_status: 'public', price_hum: null },
  { id: 'lunas-cafe', name: "Luna's Cafe", type: 'cafe', capacity: 24, owner_id: null, is_public: true, created_at: '', top: '68%', left: '76%', presence: 3, land_status: 'public', price_hum: null },
  { id: 'human-gallery', name: 'Human Gallery', type: 'gallery', capacity: 30, owner_id: null, is_public: true, created_at: '', top: '27%', left: '25%', presence: 2, land_status: 'public', price_hum: null },
];

function readRoomOverrides(): Record<string, Partial<RoomData>> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(ROOM_META_STORAGE_KEY) ?? '{}') as Record<string, Partial<RoomData>>; }
  catch { return {}; }
}
function withOverrides(rooms: RoomData[]) { if (!useDevelopmentAdmin) return rooms; const overrides = readRoomOverrides(); return rooms.map((room) => ({ ...room, ...(overrides[room.id] ?? {}) })); }
function emitMapUpdate() { if (typeof window !== 'undefined') window.dispatchEvent(new Event(ROOM_MAP_UPDATED_EVENT)); }
function getLocalRooms() { return withOverrides(demoRooms); }

export const RoomService = {
  async getRooms(): Promise<RoomData[]> {
    if (useDevelopmentPersistence) return getLocalRooms().filter((room) => room.is_public);
    const rooms = (await persistenceRequest<{ rooms: RoomData[] }>('/rooms')).rooms;
    return withOverrides(rooms.map((room) => ({ ...room, presence: 0 }))).filter((room) => room.is_public);
  },
  getAdminRooms(): RoomData[] { return getLocalRooms(); },
  getRoom(id: string) { const rooms = getLocalRooms(); return rooms.find((room) => room.id === id) ?? rooms[0]; },
  notifyMapUpdated() { emitMapUpdate(); },
  saveRoomMeta(room: RoomData) {
    if (!useDevelopmentAdmin || typeof window === 'undefined') return;
    const overrides = readRoomOverrides();
    overrides[room.id] = { name: room.name, capacity: room.capacity, is_public: room.is_public, top: room.top, left: room.left, land_status: room.land_status, price_hum: room.price_hum };
    window.localStorage.setItem(ROOM_META_STORAGE_KEY, JSON.stringify(overrides)); emitMapUpdate();
  },
  resetRoomMeta(roomId: string) { if (!useDevelopmentAdmin || typeof window === 'undefined') return; const overrides = readRoomOverrides(); delete overrides[roomId]; window.localStorage.setItem(ROOM_META_STORAGE_KEY, JSON.stringify(overrides)); emitMapUpdate(); },
  async getPublishedLayout(roomId: string): Promise<{ roomId: string; version: number; layout: RoomDefinition | null; updatedAt: string } | null> {
    if (useDevelopmentAdmin) return null;
    return (await persistenceRequest<{ published: { roomId: string; version: number; layout: RoomDefinition | null; updatedAt: string } | null }>(`/rooms/${encodeURIComponent(roomId)}/layout`)).published;
  },
  async createRoom(name: string, type: string): Promise<RoomData> {
    if (useDevelopmentPersistence) {
      return { id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-demo`, name, type, owner_id: null, capacity: 20, is_public: true, created_at: new Date().toISOString(), top: '50%', left: '50%', presence: 1, land_status: 'public', price_hum: null };
    }
    return (await persistenceRequest<{ room: RoomData }>('/rooms', { method: 'POST', body: JSON.stringify({ name, type }) })).room;
  },
};
