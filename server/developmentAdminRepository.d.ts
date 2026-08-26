import { type AdminAuditRecord, type AdminRepository, type AdminRole, type AdminRoleRecord, type AdminRoomMetadataInput, type PublishedRoomLayout, type PublishRoomLayoutInput, type ResetRoomLayoutInput } from './adminAuthorization.js';
import type { RoomRecord } from './persistence.js';
export declare class DevelopmentAdminRepository implements AdminRepository {
    readonly roles: Map<string, AdminRoleRecord>;
    readonly rooms: Map<string, RoomRecord>;
    readonly layouts: Map<string, PublishedRoomLayout>;
    readonly audits: AdminAuditRecord[];
    addKnownUser(_userId: string): void;
    private audit;
    private requireOwner;
    private requireRoomWriter;
    getRole(userId: string): Promise<AdminRole | null>;
    ensureBootstrapOwner(userId: string): Promise<void>;
    listRoles(): Promise<AdminRoleRecord[]>;
    setRole(actorUserId: string, targetUserId: string, role: AdminRole): Promise<{
        userId: string;
        username: string;
        role: AdminRole;
        createdAt: string;
        updatedAt: string;
    }>;
    deleteRole(actorUserId: string, targetUserId: string): Promise<void>;
    private ownerCount;
    listRooms(): Promise<RoomRecord[]>;
    updateRoomMetadata(actorUserId: string, input: AdminRoomMetadataInput): Promise<RoomRecord>;
    getRoomLayout(roomId: string): Promise<PublishedRoomLayout | null>;
    publishRoomLayout(actorUserId: string, input: PublishRoomLayoutInput): Promise<{
        roomId: string;
        version: number;
        layout: unknown;
        updatedAt: string;
    }>;
    resetRoomLayout(actorUserId: string, input: ResetRoomLayoutInput): Promise<number>;
    getAuditRecords(): Promise<AdminAuditRecord[]>;
}
//# sourceMappingURL=developmentAdminRepository.d.ts.map