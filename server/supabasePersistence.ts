import { randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { InternalUser } from './appSession.js';
import {
  slugForRoom,
  type AvatarAppearance,
  type CreatePostInput,
  type CreateRoomInput,
  type PersistenceConfig,
  type PersistenceRepository,
  type PostRecord,
  type ProfileCounts,
  type ProfileRecord,
  type RoomRecord,
} from './persistence.js';

function databaseFailure(): Error {
  return new Error('Persistence operation failed');
}
function requireData<T>(data: T | null, error: unknown): T {
  if (error || data === null) throw databaseFailure();
  return data;
}

export function createSupabasePersistenceRepository(config: PersistenceConfig): PersistenceRepository {
  if (config.mode !== 'supabase' || !config.supabaseUrl || !config.serviceRoleKey) {
    throw new Error('Invalid Supabase persistence configuration');
  }
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'human-world-server' } },
  });
  return new SupabasePersistenceRepository(client);
}

class SupabasePersistenceRepository implements PersistenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsertVerifiedProfile(user: InternalUser): Promise<ProfileRecord> {
    const { data, error } = await this.client.from('profiles').upsert({
      id: user.id,
      username: user.username,
      verification_status: true,
    }, { onConflict: 'id' }).select('*').single();
    return requireData(data as ProfileRecord | null, error);
  }

  async getProfileByUsername(username: string): Promise<ProfileRecord | null> {
    const { data, error } = await this.client.from('profiles').select('*').eq('username', username).maybeSingle();
    if (error) throw databaseFailure();
    return data as ProfileRecord | null;
  }

  async getProfileCounts(userId: string): Promise<ProfileCounts> {
    const [followers, following] = await Promise.all([
      this.client.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      this.client.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    if (followers.error || following.error) throw databaseFailure();
    return { followers: followers.count ?? 0, following: following.count ?? 0 };
  }

  async isFollowing(actorId: string, targetId: string): Promise<boolean> {
    const { count, error } = await this.client.from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('follower_id', actorId).eq('following_id', targetId);
    if (error) throw databaseFailure();
    return (count ?? 0) > 0;
  }

  async setFollowing(actorId: string, targetId: string, following: boolean): Promise<boolean> {
    if (following) {
      const target = await this.client.from('profiles').select('id').eq('id', targetId).maybeSingle();
      if (target.error || !target.data) throw databaseFailure();
      const { error } = await this.client.from('follows').upsert({
        follower_id: actorId,
        following_id: targetId,
      }, { ignoreDuplicates: true, onConflict: 'follower_id,following_id' });
      if (error) throw databaseFailure();
    } else {
      const { error } = await this.client.from('follows').delete()
        .eq('follower_id', actorId).eq('following_id', targetId);
      if (error) throw databaseFailure();
    }
    return this.isFollowing(actorId, targetId);
  }

  async getFeed(): Promise<PostRecord[]> {
    const { data, error } = await this.client.from('posts').select('*')
      .order('created_at', { ascending: false }).limit(50);
    if (error || !data) throw databaseFailure();
    return data as PostRecord[];
  }

  async createPost(actor: InternalUser, input: CreatePostInput): Promise<PostRecord> {
    let roomName: string | null = null;
    if (input.roomId) {
      const room = await this.client.from('rooms').select('name').eq('id', input.roomId).maybeSingle();
      if (room.error || !room.data || typeof room.data.name !== 'string') throw databaseFailure();
      roomName = room.data.name;
    }
    const { data, error } = await this.client.from('posts').insert({
      author_id: actor.id,
      author_name: actor.username,
      content: input.content,
      room_id: input.roomId,
      room_name: roomName,
    }).select('*').single();
    return requireData(data as PostRecord | null, error);
  }

  async likePost(actorId: string, postId: number): Promise<number> {
    const { error } = await this.client.from('post_likes').upsert({
      post_id: postId,
      user_id: actorId,
    }, { ignoreDuplicates: true, onConflict: 'post_id,user_id' });
    if (error) throw databaseFailure();
    const result = await this.client.from('post_likes')
      .select('user_id', { count: 'exact', head: true }).eq('post_id', postId);
    if (result.error) throw databaseFailure();
    return result.count ?? 0;
  }

  async listRooms(): Promise<RoomRecord[]> {
    const { data, error } = await this.client.from('rooms').select('*')
      .eq('is_public', true).order('created_at', { ascending: true });
    if (error || !data) throw databaseFailure();
    return data as RoomRecord[];
  }

  async createRoom(actor: InternalUser, input: CreateRoomInput): Promise<RoomRecord> {
    const id = slugForRoom(input.name, randomBytes(4).toString('hex'));
    const { data, error } = await this.client.from('rooms').insert({
      id,
      name: input.name,
      owner_id: actor.id,
      type: input.type,
    }).select('*').single();
    return requireData(data as RoomRecord | null, error);
  }

  async getAvatar(actorId: string): Promise<AvatarAppearance | null> {
    const { data, error } = await this.client.from('avatar_appearances')
      .select('base_color,hair_color,outfit_color,accessory_color,hair')
      .eq('user_id', actorId).maybeSingle();
    if (error) throw databaseFailure();
    if (!data) return null;
    return {
      accessoryColor: data.accessory_color as number,
      baseColor: data.base_color as number,
      hair: data.hair as AvatarAppearance['hair'],
      hairColor: data.hair_color as number,
      outfitColor: data.outfit_color as number,
    };
  }

  async updateAvatar(actorId: string, appearance: AvatarAppearance): Promise<AvatarAppearance> {
    const { error } = await this.client.from('avatar_appearances').upsert({
      accessory_color: appearance.accessoryColor,
      base_color: appearance.baseColor,
      hair: appearance.hair,
      hair_color: appearance.hairColor,
      outfit_color: appearance.outfitColor,
      user_id: actorId,
    }, { onConflict: 'user_id' });
    if (error) throw databaseFailure();
    return appearance;
  }
}

const DEMO_ROOMS: RoomRecord[] = [
  { id: 'central-plaza', name: 'Central Plaza', owner_id: null, type: 'plaza', capacity: 50, is_public: true, created_at: '', top: '48%', left: '50%' },
  { id: 'lunas-cafe', name: "Luna's Cafe", owner_id: null, type: 'cafe', capacity: 24, is_public: true, created_at: '', top: '68%', left: '76%' },
  { id: 'human-gallery', name: 'Human Gallery', owner_id: null, type: 'gallery', capacity: 30, is_public: true, created_at: '', top: '27%', left: '25%' },
];

export class DevelopmentMemoryPersistenceRepository implements PersistenceRepository {
  readonly profiles = new Map<string, ProfileRecord>();
  readonly follows = new Set<string>();
  readonly posts: PostRecord[] = [];
  readonly likes = new Set<string>();
  readonly avatars = new Map<string, AvatarAppearance>();
  readonly rooms = new Map(DEMO_ROOMS.map((room) => [room.id, room]));
  private nextPostId = 1;

  async upsertVerifiedProfile(user: InternalUser) {
    const existing = this.profiles.get(user.id);
    const profile: ProfileRecord = existing ?? { id: user.id, username: user.username, bio: null, verification_status: true, avatar_url: null, xp: 0, level: 1, created_at: new Date().toISOString() };
    this.profiles.set(user.id, profile);
    return profile;
  }
  async getProfileByUsername(username: string) { return [...this.profiles.values()].find((profile) => profile.username === username) ?? null; }
  async getProfileCounts(userId: string) { return { followers: [...this.follows].filter((key) => key.endsWith(`:${userId}`)).length, following: [...this.follows].filter((key) => key.startsWith(`${userId}:`)).length }; }
  async isFollowing(actorId: string, targetId: string) { return this.follows.has(`${actorId}:${targetId}`); }
  async setFollowing(actorId: string, targetId: string, following: boolean) { if (actorId === targetId || !this.profiles.has(targetId)) throw databaseFailure(); const key = `${actorId}:${targetId}`; if (following) this.follows.add(key); else this.follows.delete(key); return this.follows.has(key); }
  async getFeed() { return [...this.posts].reverse(); }
  async createPost(actor: InternalUser, input: CreatePostInput) { const room = input.roomId ? this.rooms.get(input.roomId) : null; if (input.roomId && !room) throw databaseFailure(); const post: PostRecord = { id: this.nextPostId++, author_id: actor.id, author_name: actor.username, content: input.content, created_at: new Date().toISOString(), room_id: input.roomId, room_name: room?.name ?? null, likes: 0, comments: 0, is_system: false }; this.posts.push(post); return post; }
  async likePost(actorId: string, postId: number) { if (!this.posts.some((post) => post.id === postId)) throw databaseFailure(); this.likes.add(`${postId}:${actorId}`); const count = [...this.likes].filter((key) => key.startsWith(`${postId}:`)).length; const post = this.posts.find((candidate) => candidate.id === postId); if (post) post.likes = count; return count; }
  async listRooms() { return [...this.rooms.values()].filter((room) => room.is_public); }
  async createRoom(actor: InternalUser, input: CreateRoomInput) { const room: RoomRecord = { id: slugForRoom(input.name, randomBytes(4).toString('hex')), name: input.name, owner_id: actor.id, type: input.type, capacity: 20, is_public: true, created_at: new Date().toISOString(), top: '50%', left: '50%' }; this.rooms.set(room.id, room); return room; }
  async getAvatar(actorId: string) { return this.avatars.get(actorId) ?? null; }
  async updateAvatar(actorId: string, appearance: AvatarAppearance) { this.avatars.set(actorId, appearance); return appearance; }
}
