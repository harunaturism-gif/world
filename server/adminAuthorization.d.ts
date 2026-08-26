import type { AppSessionConfig, InternalUser } from './appSession.js';
import { type RoomRecord } from './persistence.js';
export type AdminRole = 'owner' | 'editor';
export type AdminCapability = 'admin:access' | 'rooms:write' | 'roles:manage';
export interface AdminConfig {
    bootstrapUserIds: ReadonlySet<string>;
    developmentAdminEnabled: boolean;
}
export interface AdminSession {
    role: AdminRole;
    capabilities: readonly AdminCapability[];
}
export interface AdminRoleRecord {
    userId: string;
    username: string;
    role: AdminRole;
    createdAt: string;
    updatedAt: string;
}
export interface AdminRoomMetadataInput {
    roomId: string;
    name: string;
    type: string;
    capacity: number;
    isPublic: boolean;
    top: number;
    left: number;
    landStatus: 'public' | 'available' | 'owned' | 'reserved';
    priceHum: number | null;
}
export interface PublishedRoomLayout {
    roomId: string;
    version: number;
    layout: unknown | null;
    updatedAt: string;
}
export interface PublishRoomLayoutInput {
    roomId: string;
    expectedVersion: number;
    layout: unknown;
}
export interface ResetRoomLayoutInput {
    roomId: string;
    expectedVersion: number;
}
export interface AdminAuditRecord {
    actorUserId: string;
    action: string;
    targetResourceType: 'role' | 'room' | 'room_layout';
    targetResourceId: string;
    resultingVersion: number | null;
    metadata: Record<string, string | number | boolean | null>;
    createdAt: string;
}
export interface AdminRepository {
    getRole(userId: string): Promise<AdminRole | null>;
    ensureBootstrapOwner(userId: string): Promise<void>;
    listRoles(): Promise<AdminRoleRecord[]>;
    setRole(actorUserId: string, targetUserId: string, role: AdminRole): Promise<AdminRoleRecord>;
    deleteRole(actorUserId: string, targetUserId: string): Promise<void>;
    listRooms(): Promise<RoomRecord[]>;
    updateRoomMetadata(actorUserId: string, input: AdminRoomMetadataInput): Promise<RoomRecord>;
    getRoomLayout(roomId: string): Promise<PublishedRoomLayout | null>;
    publishRoomLayout(actorUserId: string, input: PublishRoomLayoutInput): Promise<PublishedRoomLayout>;
    resetRoomLayout(actorUserId: string, input: ResetRoomLayoutInput): Promise<number>;
    getAuditRecords(): Promise<AdminAuditRecord[]>;
}
export declare class AdminVersionConflictError extends Error {
    constructor();
}
export declare class AdminInvariantError extends Error {
    constructor();
}
export type AdminAuthenticationResult = {
    accepted: true;
    user: InternalUser;
    session: AdminSession;
} | {
    accepted: false;
    statusCode: 401 | 403 | 503;
};
export declare function capabilitiesForRole(role: AdminRole): readonly AdminCapability[];
export declare function hasCapability(session: AdminSession, capability: AdminCapability): boolean;
export declare function createAdminConfig(environment: Record<string, string | undefined>): AdminConfig | null;
export declare function shouldBootstrapOwner(config: AdminConfig, userId: string): boolean;
export declare function authenticateAdminRequest(input: {
    appSessionConfig: AppSessionConfig | null;
    repository: AdminRepository | null;
    cookieHeader: string | undefined;
    originHeader: string | undefined;
    now?: number;
}): Promise<AdminAuthenticationResult>;
export declare function parseRoleInput(value: unknown): AdminRole | null;
export declare function parseRoomMetadataInput(value: unknown, routeRoomId: string): AdminRoomMetadataInput | null;
export declare function parsePublishRoomLayoutInput(value: unknown, routeRoomId: string): PublishRoomLayoutInput | null;
export declare function parseResetRoomLayoutInput(value: unknown, routeRoomId: string): ResetRoomLayoutInput | null;
//# sourceMappingURL=adminAuthorization.d.ts.map