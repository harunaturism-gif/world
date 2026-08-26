import { createClient } from '@supabase/supabase-js';
import { AdminInvariantError, AdminVersionConflictError, } from './adminAuthorization.js';
function persistenceFailure() { return new Error('Admin persistence operation failed'); }
function throwForError(error) {
    if (!error)
        return;
    if (error.message?.includes('version_conflict'))
        throw new AdminVersionConflictError();
    if (error.message?.includes('last_owner') || error.message?.includes('admin_invariant'))
        throw new AdminInvariantError();
    throw persistenceFailure();
}
function roleRecord(value) {
    const row = value;
    return { userId: row.user_id, username: row.username, role: row.role, createdAt: row.created_at, updatedAt: row.updated_at };
}
function layoutRecord(value) {
    const row = value;
    return { roomId: row.room_id, version: row.version, layout: row.definition, updatedAt: row.updated_at };
}
export function createSupabaseAdminRepository(config) {
    if (config.mode !== 'supabase' || !config.supabaseUrl || !config.serviceRoleKey)
        throw new Error('Invalid admin persistence configuration');
    const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
        global: { headers: { 'X-Client-Info': 'human-world-admin-server' } },
    });
    return new SupabaseAdminRepository(client);
}
class SupabaseAdminRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async getRole(userId) {
        const { data, error } = await this.client.from('admin_roles').select('role').eq('user_id', userId).maybeSingle();
        if (error)
            throw persistenceFailure();
        return data ? data.role : null;
    }
    async ensureBootstrapOwner(userId) {
        const { error } = await this.client.rpc('admin_bootstrap_owner', { p_target_user_id: userId });
        throwForError(error);
    }
    async listRoles() {
        const { data, error } = await this.client.from('admin_role_directory').select('*').order('created_at');
        if (error || !data)
            throw persistenceFailure();
        return data.map(roleRecord);
    }
    async setRole(actorUserId, targetUserId, role) {
        const { data, error } = await this.client.rpc('admin_set_role', { p_actor_user_id: actorUserId, p_assigned_role: role, p_target_user_id: targetUserId });
        throwForError(error);
        if (!data || !Array.isArray(data) || data.length !== 1)
            throw persistenceFailure();
        return roleRecord(data[0]);
    }
    async deleteRole(actorUserId, targetUserId) {
        const { error } = await this.client.rpc('admin_delete_role', { p_actor_user_id: actorUserId, p_target_user_id: targetUserId });
        throwForError(error);
    }
    async listRooms() {
        const { data, error } = await this.client.from('rooms').select('*').order('created_at');
        if (error || !data)
            throw persistenceFailure();
        return data;
    }
    async updateRoomMetadata(actorUserId, input) {
        const { data, error } = await this.client.rpc('admin_update_room_metadata', {
            p_actor_user_id: actorUserId,
            p_room_capacity: input.capacity,
            p_room_id: input.roomId,
            p_room_is_public: input.isPublic,
            p_room_land_status: input.landStatus,
            p_room_left: `${input.left}%`,
            p_room_name: input.name,
            p_room_price_hum: input.priceHum,
            p_room_top: `${input.top}%`,
            p_room_type: input.type,
        });
        throwForError(error);
        if (!data || !Array.isArray(data) || data.length !== 1)
            throw persistenceFailure();
        return data[0];
    }
    async getRoomLayout(roomId) {
        const { data, error } = await this.client.from('published_room_layouts').select('room_id,version,definition,updated_at').eq('room_id', roomId).maybeSingle();
        if (error)
            throw persistenceFailure();
        return data ? layoutRecord(data) : null;
    }
    async publishRoomLayout(actorUserId, input) {
        const { data, error } = await this.client.rpc('admin_publish_room_layout', {
            p_actor_user_id: actorUserId,
            p_expected_version: input.expectedVersion,
            p_layout_definition: input.layout,
            p_room_id: input.roomId,
        });
        throwForError(error);
        if (!data || !Array.isArray(data) || data.length !== 1)
            throw persistenceFailure();
        return layoutRecord(data[0]);
    }
    async resetRoomLayout(actorUserId, input) {
        const { data, error } = await this.client.rpc('admin_reset_room_layout', {
            p_actor_user_id: actorUserId,
            p_expected_version: input.expectedVersion,
            p_room_id: input.roomId,
        });
        throwForError(error);
        if (typeof data !== 'number' || !Number.isSafeInteger(data) || data < 1)
            throw persistenceFailure();
        return data;
    }
    async getAuditRecords() {
        const { data, error } = await this.client.from('admin_audit_log').select('actor_user_id,action,target_resource_type,target_resource_id,resulting_version,metadata,created_at').order('created_at');
        if (error || !data)
            throw persistenceFailure();
        return data.map((value) => {
            const row = value;
            return { actorUserId: row.actor_user_id, action: row.action, targetResourceType: row.target_resource_type, targetResourceId: row.target_resource_id, resultingVersion: row.resulting_version, metadata: row.metadata, createdAt: row.created_at };
        });
    }
}
//# sourceMappingURL=supabaseAdminRepository.js.map