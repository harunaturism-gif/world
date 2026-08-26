import type { RoomDefinition } from '../game/roomEngine';
import type { RoomData } from './RoomService';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export type AdminRole = 'owner' | 'editor';
export type AdminCapability = 'admin:access' | 'rooms:write' | 'roles:manage';

export interface AdminSession {
  role: AdminRole;
  capabilities: AdminCapability[];
}

export interface PublishedLayout {
  roomId: string;
  version: number;
  layout: RoomDefinition | null;
  updatedAt: string;
}

export const useDevelopmentAdmin = import.meta.env.DEV
  && import.meta.env.VITE_ENABLE_DEV_ADMIN === 'true';

export class AdminAuthorizationError extends Error {}
export class AdminVersionConflictError extends Error {}

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${backendUrl}/api/admin${path}`, {
    ...init,
    credentials: 'include',
    headers: init.body === undefined ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
  });
  if (response.status === 401 || response.status === 403) throw new AdminAuthorizationError('Admin access denied');
  if (response.status === 409) throw new AdminVersionConflictError('Published room changed');
  if (!response.ok) throw new Error('Admin service unavailable');
  return response.json() as Promise<T>;
}

function metadataBody(room: RoomData) {
  const percentage = (value: string) => Number(value.replace(/%$/, ''));
  return {
    capacity: room.capacity,
    isPublic: room.is_public,
    landStatus: room.land_status ?? 'public',
    left: percentage(room.left),
    name: room.name,
    priceHum: room.price_hum ?? null,
    roomId: room.id,
    top: percentage(room.top),
    type: room.type,
  };
}

export const AdminService = {
  async getSession(): Promise<AdminSession | null> {
    if (useDevelopmentAdmin) return { role: 'owner', capabilities: ['admin:access', 'rooms:write', 'roles:manage'] };
    try { return await adminRequest<AdminSession>('/session'); }
    catch (error) { if (error instanceof AdminAuthorizationError) return null; throw error; }
  },
  async getRooms(): Promise<RoomData[]> {
    return (await adminRequest<{ rooms: RoomData[] }>('/rooms')).rooms;
  },
  async updateRoom(room: RoomData): Promise<RoomData> {
    return (await adminRequest<{ room: RoomData }>(`/rooms/${encodeURIComponent(room.id)}`, { method: 'PATCH', body: JSON.stringify(metadataBody(room)) })).room;
  },
  async getLayout(roomId: string): Promise<PublishedLayout | null> {
    return (await adminRequest<{ published: PublishedLayout | null }>(`/rooms/${encodeURIComponent(roomId)}/layout`)).published;
  },
  async publishLayout(roomId: string, expectedVersion: number, layout: RoomDefinition): Promise<PublishedLayout> {
    return (await adminRequest<{ published: PublishedLayout }>(`/rooms/${encodeURIComponent(roomId)}/layout`, { method: 'PUT', body: JSON.stringify({ expectedVersion, layout, roomId }) })).published;
  },
  async resetLayout(roomId: string, expectedVersion: number): Promise<number> {
    return (await adminRequest<{ reset: true; version: number }>(`/rooms/${encodeURIComponent(roomId)}/layout`, { method: 'DELETE', body: JSON.stringify({ expectedVersion, roomId }) })).version;
  },
  async listRoles() { return (await adminRequest<{ roles: unknown[] }>('/roles')).roles; },
  async setRole(userId: string, role: AdminRole) { return adminRequest(`/roles/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify({ role }) }); },
  async removeRole(userId: string) { return adminRequest(`/roles/${encodeURIComponent(userId)}`, { method: 'DELETE' }); },
};
