import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  AdminInvariantError,
  AdminVersionConflictError,
  type AdminAuditRecord,
  type AdminRepository,
  type AdminRole,
  type AdminRoleRecord,
  type AdminRoomMetadataInput,
  type PublishedRoomLayout,
  type PublishRoomLayoutInput,
  type ResetRoomLayoutInput,
} from './adminAuthorization.js';
import type { PersistenceConfig, RoomRecord } from './persistence.js';

function persistenceFailure() { return new Error('Admin persistence operation failed'); }

function throwForError(error: { message?: string } | null) {
  if (!error) return;
  if (error.message?.includes('version_conflict')) throw new AdminVersionConflictError();
  if (error.message?.includes('last_owner') || error.message?.includes('admin_invariant')) throw new AdminInvariantError();
  throw persistenceFailure();
}

function roleRecord(value: unknown): AdminRoleRecord {
  const row = value as { user_id: string; username: string; role: AdminRole; created_at: string; updated_at: string };
  return { userId: row.user_id, username: row.username, role: row.role, createdAt: row.created_at, updatedAt: row.updated_at };
}

function layoutRecord(value: unknown): PublishedRoomLayout {
  const row = value as { room_id: string; version: number; definition: unknown; updated_at: string };
  return { roomId: row.room_id, version: row.version, layout: row.definition, updatedAt: row.updated_at };
}

export function createSupabaseAdminRepository(config: PersistenceConfig): AdminRepository {
  if (config.mode !== 'supabase' || !config.supabaseUrl || !config.serviceRoleKey) throw new Error('Invalid admin persistence configuration');
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'human-world-admin-server' } },
  });
  return new SupabaseAdminRepository(client);
}

class SupabaseAdminRepository implements AdminRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getRole(userId: string): Promise<AdminRole | null> {
    const { data, error } = await this.client.from('admin_roles').select('role').eq('user_id', userId).maybeSingle();
    if (error) throw persistenceFailure();
    return data ? data.role as AdminRole : null;
  }

  async ensureBootstrapOwner(userId: string) {
    const { error } = await this.client.rpc('admin_bootstrap_owner', { p_target_user_id: userId });
    throwForError(error);
  }

  async listRoles(): Promise<AdminRoleRecord[]> {
    const { data, error } = await this.client.from('admin_role_directory').select('*').order('created_at');
    if (error || !data) throw persistenceFailure();
    return data.map(roleRecord);
  }

  async setRole(actorUserId: string, targetUserId: string, role: AdminRole): Promise<AdminRoleRecord> {
    const { data, error } = await this.client.rpc('admin_set_role', { p_actor_user_id: actorUserId, p_assigned_role: role, p_target_user_id: targetUserId });
    throwForError(error);
    if (!data || !Array.isArray(data) || data.length !== 1) throw persistenceFailure();
    return roleRecord(data[0]);
  }

  async deleteRole(actorUserId: string, targetUserId: string) {
    const { error } = await this.client.rpc('admin_delete_role', { p_actor_user_id: actorUserId, p_target_user_id: targetUserId });
    throwForError(error);
  }

  async listRooms(): Promise<RoomRecord[]> {
    const { data, error } = await this.client.from('rooms').select('*').order('created_at');
    if (error || !data) throw persistenceFailure();
    return data as RoomRecord[];
  }

  async updateRoomMetadata(actorUserId: string, input: AdminRoomMetadataInput): Promise<RoomRecord> {
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
    if (!data || !Array.isArray(data) || data.length !== 1) throw persistenceFailure();
    return data[0] as RoomRecord;
  }

  async getRoomLayout(roomId: string): Promise<PublishedRoomLayout | null> {
    const { data, error } = await this.client.from('published_room_layouts').select('room_id,version,definition,updated_at').eq('room_id', roomId).maybeSingle();
    if (error) throw persistenceFailure();
    return data ? layoutRecord(data) : null;
  }

  async publishRoomLayout(actorUserId: string, input: PublishRoomLayoutInput): Promise<PublishedRoomLayout> {
    const { data, error } = await this.client.rpc('admin_publish_room_layout', {
      p_actor_user_id: actorUserId,
      p_expected_version: input.expectedVersion,
      p_layout_definition: input.layout,
      p_room_id: input.roomId,
    });
    throwForError(error);
    if (!data || !Array.isArray(data) || data.length !== 1) throw persistenceFailure();
    return layoutRecord(data[0]);
  }

  async resetRoomLayout(actorUserId: string, input: ResetRoomLayoutInput) {
    const { data, error } = await this.client.rpc('admin_reset_room_layout', {
      p_actor_user_id: actorUserId,
      p_expected_version: input.expectedVersion,
      p_room_id: input.roomId,
    });
    throwForError(error);
    if (typeof data !== 'number' || !Number.isSafeInteger(data) || data < 1) throw persistenceFailure();
    return data;
  }

  async getAuditRecords(): Promise<AdminAuditRecord[]> {
    const { data, error } = await this.client.from('admin_audit_log').select('actor_user_id,action,target_resource_type,target_resource_id,resulting_version,metadata,created_at').order('created_at');
    if (error || !data) throw persistenceFailure();
    return data.map((value) => {
      const row = value as { actor_user_id: string; action: string; target_resource_type: AdminAuditRecord['targetResourceType']; target_resource_id: string; resulting_version: number | null; metadata: AdminAuditRecord['metadata']; created_at: string };
      return { actorUserId: row.actor_user_id, action: row.action, targetResourceType: row.target_resource_type, targetResourceId: row.target_resource_id, resultingVersion: row.resulting_version, metadata: row.metadata, createdAt: row.created_at };
    });
  }
}
