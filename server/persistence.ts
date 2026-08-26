import type { InternalUser, AppSessionConfig } from './appSession.js';
import { extractSessionToken, signApplicationSession, verifyApplicationSession } from './appSession.js';

export const MAX_POST_LENGTH = 2_000;
export const MAX_ROOM_NAME_LENGTH = 80;
export const MAX_ROOM_TYPE_LENGTH = 32;
export const MAX_BIO_LENGTH = 280;

const INTERNAL_USER_ID_PATTERN = /^user_[0-9a-f]{64}$/;
const USERNAME_PATTERN = /^Human_[0-9A-F]{8}$/;
const ROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ROOM_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
const HEX_COLOR_MAX = 0xffffff;
const HAIR_STYLES = new Set(['short', 'wave', 'buzz']);

export interface PersistenceConfig {
  mode: 'supabase' | 'development-mock';
  serviceRoleKey?: string;
  supabaseUrl?: string;
}

export interface ProfileRecord {
  id: string;
  username: string;
  bio: string | null;
  verification_status: boolean;
  avatar_url: string | null;
  xp: number;
  level: number;
  created_at: string;
}

export interface ProfileCounts {
  followers: number;
  following: number;
}

export interface PostRecord {
  id: number;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  room_id: string | null;
  room_name: string | null;
  likes: number;
  comments: number;
  is_system: boolean;
}

export interface RoomRecord {
  id: string;
  name: string;
  owner_id: string | null;
  type: string;
  capacity: number;
  is_public: boolean;
  created_at: string;
  top: string;
  left: string;
  land_status: 'public' | 'available' | 'owned' | 'reserved';
  price_hum: number | null;
}

export interface AvatarAppearance {
  baseColor: number;
  hairColor: number;
  outfitColor: number;
  accessoryColor: number;
  hair: 'short' | 'wave' | 'buzz';
}

export interface CreatePostInput {
  content: string;
  roomId: string | null;
}

export interface CreateRoomInput {
  name: string;
  type: string;
}

export interface PersistenceRepository {
  upsertVerifiedProfile(user: InternalUser): Promise<ProfileRecord>;
  getProfileByUsername(username: string): Promise<ProfileRecord | null>;
  getProfileCounts(userId: string): Promise<ProfileCounts>;
  isFollowing(actorId: string, targetId: string): Promise<boolean>;
  setFollowing(actorId: string, targetId: string, following: boolean): Promise<boolean>;
  getFeed(): Promise<PostRecord[]>;
  createPost(actor: InternalUser, input: CreatePostInput): Promise<PostRecord>;
  likePost(actorId: string, postId: number): Promise<number>;
  listRooms(): Promise<RoomRecord[]>;
  createRoom(actor: InternalUser, input: CreateRoomInput): Promise<RoomRecord>;
  getAvatar(actorId: string): Promise<AvatarAppearance | null>;
  updateAvatar(actorId: string, appearance: AvatarAppearance): Promise<AvatarAppearance>;
}

export async function persistVerifiedIdentity(
  repository: PersistenceRepository,
  user: InternalUser,
): Promise<ProfileRecord> {
  const profile = await repository.upsertVerifiedProfile(user);
  if (profile.id !== user.id || profile.username !== user.username || profile.verification_status !== true) {
    throw new Error('Verified profile persistence failed');
  }
  return profile;
}

export async function issuePersistedApplicationSession(
  repository: PersistenceRepository,
  user: InternalUser,
  sessionSecret: string,
): Promise<string> {
  await persistVerifiedIdentity(repository, user);
  return signApplicationSession(user, sessionSecret);
}

export type PersistenceAuthenticationResult =
  | { accepted: true; user: InternalUser }
  | { accepted: false; statusCode: 401 | 403 | 503 };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function isSafeIntegerColor(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= HEX_COLOR_MAX;
}

export function isInternalUserId(value: unknown): value is string {
  return typeof value === 'string' && INTERNAL_USER_ID_PATTERN.test(value);
}

export function isUsername(value: unknown): value is string {
  return typeof value === 'string' && USERNAME_PATTERN.test(value);
}

export function isRoomId(value: unknown): value is string {
  return typeof value === 'string' && ROOM_ID_PATTERN.test(value);
}

export function createPersistenceConfig(
  environment: Record<string, string | undefined>,
): PersistenceConfig | null {
  const isDevelopment = environment.NODE_ENV === 'development';
  const mockEnabled = environment.ENABLE_DEV_MOCK_PERSISTENCE === 'true';
  const supabaseUrl = environment.SUPABASE_URL;
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY;

  if (isDevelopment && mockEnabled && !supabaseUrl && !serviceRoleKey) {
    return { mode: 'development-mock' };
  }
  if (!supabaseUrl || supabaseUrl !== supabaseUrl.trim()
    || !serviceRoleKey || serviceRoleKey !== serviceRoleKey.trim()
    || serviceRoleKey.length < 32
    || serviceRoleKey === 'mock-service-role-key') {
    return null;
  }

  try {
    const parsed = new URL(supabaseUrl);
    if ((parsed.protocol !== 'https:' && !(isDevelopment && parsed.protocol === 'http:'))
      || parsed.username || parsed.password || parsed.search || parsed.hash
      || supabaseUrl !== parsed.origin) {
      return null;
    }
  } catch {
    return null;
  }

  return { mode: 'supabase', serviceRoleKey, supabaseUrl };
}

export function authenticatePersistenceRequest(input: {
  config: AppSessionConfig | null;
  cookieHeader: string | undefined;
  originHeader: string | undefined;
  now?: number;
}): PersistenceAuthenticationResult {
  if (!input.config) return { accepted: false, statusCode: 503 };
  if (input.originHeader !== input.config.appOrigin) return { accepted: false, statusCode: 403 };
  const token = extractSessionToken(input.cookieHeader, input.config.isProduction);
  const user = token
    ? verifyApplicationSession(token, input.config.sessionSecret, input.now)
    : null;
  return user ? { accepted: true, user } : { accepted: false, statusCode: 401 };
}

export function parseCreatePostInput(value: unknown): CreatePostInput | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['content', 'roomId'])) return null;
  if (typeof value.content !== 'string' || value.content !== value.content.trim()
    || value.content.length < 1 || value.content.length > MAX_POST_LENGTH) return null;
  if (value.roomId !== null && !isRoomId(value.roomId)) return null;
  return { content: value.content, roomId: value.roomId as string | null };
}

export function parseCreateRoomInput(value: unknown): CreateRoomInput | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['name', 'type'])) return null;
  if (typeof value.name !== 'string' || value.name !== value.name.trim()
    || value.name.length < 1 || value.name.length > MAX_ROOM_NAME_LENGTH) return null;
  if (typeof value.type !== 'string' || value.type.length > MAX_ROOM_TYPE_LENGTH
    || !ROOM_TYPE_PATTERN.test(value.type)) return null;
  return { name: value.name, type: value.type };
}

export function parseAvatarAppearance(value: unknown): AvatarAppearance | null {
  const keys = ['accessoryColor', 'baseColor', 'hair', 'hairColor', 'outfitColor'];
  if (!isPlainObject(value) || !hasExactKeys(value, keys)) return null;
  if (!isSafeIntegerColor(value.baseColor) || !isSafeIntegerColor(value.hairColor)
    || !isSafeIntegerColor(value.outfitColor) || !isSafeIntegerColor(value.accessoryColor)
    || typeof value.hair !== 'string' || !HAIR_STYLES.has(value.hair)) return null;
  return {
    accessoryColor: value.accessoryColor,
    baseColor: value.baseColor,
    hair: value.hair as AvatarAppearance['hair'],
    hairColor: value.hairColor,
    outfitColor: value.outfitColor,
  };
}

export function parsePostId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,14}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function slugForRoom(name: string, suffix: string): string {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 48) || 'space';
  return `${base}-${suffix.toLowerCase()}`.slice(0, 64).replace(/-+$/g, '');
}
