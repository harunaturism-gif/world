import { AdminInvariantError, AdminVersionConflictError, } from './adminAuthorization.js';
const DEMO_ROOMS = [
    { id: 'central-plaza', name: 'Central Plaza', owner_id: null, type: 'plaza', capacity: 50, is_public: true, created_at: '', top: '48%', left: '50%', land_status: 'public', price_hum: null },
    { id: 'lunas-cafe', name: "Luna's Cafe", owner_id: null, type: 'cafe', capacity: 24, is_public: true, created_at: '', top: '68%', left: '76%', land_status: 'public', price_hum: null },
    { id: 'human-gallery', name: 'Human Gallery', owner_id: null, type: 'gallery', capacity: 30, is_public: true, created_at: '', top: '27%', left: '25%', land_status: 'public', price_hum: null },
];
function usernameForUserId(userId) {
    return `Human_${userId.slice(-8).toUpperCase()}`;
}
function clone(value) {
    return structuredClone(value);
}
export class DevelopmentAdminRepository {
    roles = new Map();
    rooms = new Map(DEMO_ROOMS.map((room) => [room.id, room]));
    layouts = new Map();
    audits = [];
    addKnownUser(_userId) { }
    audit(record) {
        this.audits.push({ ...record, createdAt: new Date().toISOString() });
    }
    requireOwner(actorUserId) {
        if (this.roles.get(actorUserId)?.role !== 'owner')
            throw new AdminInvariantError();
    }
    requireRoomWriter(actorUserId) {
        const role = this.roles.get(actorUserId)?.role;
        if (role !== 'owner' && role !== 'editor')
            throw new AdminInvariantError();
    }
    async getRole(userId) { return this.roles.get(userId)?.role ?? null; }
    async ensureBootstrapOwner(userId) {
        const existing = this.roles.get(userId);
        if (existing?.role === 'owner')
            return;
        const now = new Date().toISOString();
        this.roles.set(userId, { userId, username: usernameForUserId(userId), role: 'owner', createdAt: existing?.createdAt ?? now, updatedAt: now });
        this.audit({ actorUserId: userId, action: 'role.bootstrap', targetResourceType: 'role', targetResourceId: userId, resultingVersion: null, metadata: { role: 'owner' } });
    }
    async listRoles() { return [...this.roles.values()].map(clone); }
    async setRole(actorUserId, targetUserId, role) {
        this.requireOwner(actorUserId);
        const existing = this.roles.get(targetUserId);
        if (existing?.role === 'owner' && role !== 'owner' && this.ownerCount() <= 1)
            throw new AdminInvariantError();
        const now = new Date().toISOString();
        const record = { userId: targetUserId, username: usernameForUserId(targetUserId), role, createdAt: existing?.createdAt ?? now, updatedAt: now };
        this.roles.set(targetUserId, record);
        if (existing?.role !== role)
            this.audit({ actorUserId, action: 'role.set', targetResourceType: 'role', targetResourceId: targetUserId, resultingVersion: null, metadata: { role } });
        return clone(record);
    }
    async deleteRole(actorUserId, targetUserId) {
        this.requireOwner(actorUserId);
        const existing = this.roles.get(targetUserId);
        if (!existing)
            return;
        if (existing.role === 'owner' && this.ownerCount() <= 1)
            throw new AdminInvariantError();
        this.roles.delete(targetUserId);
        this.audit({ actorUserId, action: 'role.delete', targetResourceType: 'role', targetResourceId: targetUserId, resultingVersion: null, metadata: { previousRole: existing.role } });
    }
    ownerCount() { return [...this.roles.values()].filter((entry) => entry.role === 'owner').length; }
    async listRooms() { return [...this.rooms.values()].map(clone); }
    async updateRoomMetadata(actorUserId, input) {
        this.requireRoomWriter(actorUserId);
        const existing = this.rooms.get(input.roomId);
        if (!existing)
            throw new AdminInvariantError();
        const room = { ...existing, name: input.name, type: input.type, capacity: input.capacity, is_public: input.isPublic, top: `${input.top}%`, left: `${input.left}%`, land_status: input.landStatus, price_hum: input.priceHum };
        this.rooms.set(room.id, room);
        this.audit({ actorUserId, action: 'room.metadata.update', targetResourceType: 'room', targetResourceId: room.id, resultingVersion: null, metadata: { capacity: room.capacity, isPublic: room.is_public, landStatus: room.land_status } });
        return clone(room);
    }
    async getRoomLayout(roomId) { const layout = this.layouts.get(roomId); return layout ? clone(layout) : null; }
    async publishRoomLayout(actorUserId, input) {
        this.requireRoomWriter(actorUserId);
        if (!this.rooms.has(input.roomId))
            throw new AdminInvariantError();
        const existing = this.layouts.get(input.roomId);
        const currentVersion = existing?.version ?? 0;
        if (currentVersion !== input.expectedVersion)
            throw new AdminVersionConflictError();
        const published = { roomId: input.roomId, version: currentVersion + 1, layout: clone(input.layout), updatedAt: new Date().toISOString() };
        this.layouts.set(input.roomId, published);
        this.audit({ actorUserId, action: 'room.layout.publish', targetResourceType: 'room_layout', targetResourceId: input.roomId, resultingVersion: published.version, metadata: { version: published.version } });
        return clone(published);
    }
    async resetRoomLayout(actorUserId, input) {
        this.requireRoomWriter(actorUserId);
        const currentVersion = this.layouts.get(input.roomId)?.version ?? 0;
        if (currentVersion !== input.expectedVersion)
            throw new AdminVersionConflictError();
        const nextVersion = currentVersion + 1;
        this.layouts.set(input.roomId, { roomId: input.roomId, version: nextVersion, layout: null, updatedAt: new Date().toISOString() });
        this.audit({ actorUserId, action: 'room.layout.reset', targetResourceType: 'room_layout', targetResourceId: input.roomId, resultingVersion: nextVersion, metadata: { previousVersion: currentVersion, version: nextVersion } });
        return nextVersion;
    }
    async getAuditRecords() { return this.audits.map(clone); }
}
//# sourceMappingURL=developmentAdminRepository.js.map