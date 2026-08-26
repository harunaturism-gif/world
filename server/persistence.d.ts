import type { InternalUser, AppSessionConfig } from './appSession.js';
export declare const MAX_POST_LENGTH = 2000;
export declare const MAX_ROOM_NAME_LENGTH = 80;
export declare const MAX_ROOM_TYPE_LENGTH = 32;
export declare const MAX_BIO_LENGTH = 280;
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
export declare function persistVerifiedIdentity(repository: PersistenceRepository, user: InternalUser): Promise<ProfileRecord>;
export declare function issuePersistedApplicationSession(repository: PersistenceRepository, user: InternalUser, sessionSecret: string): Promise<string>;
export type PersistenceAuthenticationResult = {
    accepted: true;
    user: InternalUser;
} | {
    accepted: false;
    statusCode: 401 | 403 | 503;
};
export declare function isInternalUserId(value: unknown): value is string;
export declare function isUsername(value: unknown): value is string;
export declare function isRoomId(value: unknown): value is string;
export declare function createPersistenceConfig(environment: Record<string, string | undefined>): PersistenceConfig | null;
export declare function authenticatePersistenceRequest(input: {
    config: AppSessionConfig | null;
    cookieHeader: string | undefined;
    originHeader: string | undefined;
    now?: number;
}): PersistenceAuthenticationResult;
export declare function parseCreatePostInput(value: unknown): CreatePostInput | null;
export declare function parseCreateRoomInput(value: unknown): CreateRoomInput | null;
export declare function parseAvatarAppearance(value: unknown): AvatarAppearance | null;
export declare function parsePostId(value: unknown): number | null;
export declare function slugForRoom(name: string, suffix: string): string;
//# sourceMappingURL=persistence.d.ts.map