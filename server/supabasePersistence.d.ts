import type { InternalUser } from './appSession.js';
import { type AvatarAppearance, type CreatePostInput, type CreateRoomInput, type PersistenceConfig, type PersistenceRepository, type PostRecord, type ProfileRecord, type RoomRecord } from './persistence.js';
export declare function createSupabasePersistenceRepository(config: PersistenceConfig): PersistenceRepository;
export declare class DevelopmentMemoryPersistenceRepository implements PersistenceRepository {
    readonly profiles: Map<string, ProfileRecord>;
    readonly follows: Set<string>;
    readonly posts: PostRecord[];
    readonly likes: Set<string>;
    readonly avatars: Map<string, AvatarAppearance>;
    readonly rooms: Map<string, RoomRecord>;
    private nextPostId;
    upsertVerifiedProfile(user: InternalUser): Promise<ProfileRecord>;
    getProfileByUsername(username: string): Promise<ProfileRecord | null>;
    getProfileCounts(userId: string): Promise<{
        followers: number;
        following: number;
    }>;
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
//# sourceMappingURL=supabasePersistence.d.ts.map