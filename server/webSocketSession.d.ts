import { type AppSessionConfig, type InternalUser } from './appSession.js';
import { type RateLimitDecision } from './rateLimit.js';
export declare const MAX_WEBSOCKET_PAYLOAD_BYTES: number;
export declare const MAX_MOVEMENT_COORDINATE = 10000;
export declare const MAX_CHAT_LENGTH = 280;
export declare const WEB_SOCKET_TOTAL_RATE_LIMIT = 240;
export declare const WEB_SOCKET_TOTAL_RATE_WINDOW_MS = 10000;
export declare const WEB_SOCKET_JOIN_RATE_LIMIT = 6;
export declare const WEB_SOCKET_JOIN_RATE_WINDOW_MS = 30000;
export declare const WEB_SOCKET_MOVE_RATE_LIMIT = 200;
export declare const WEB_SOCKET_MOVE_RATE_WINDOW_MS = 10000;
export declare const WEB_SOCKET_CHAT_RATE_LIMIT = 8;
export declare const WEB_SOCKET_CHAT_RATE_WINDOW_MS = 30000;
export declare const WEB_SOCKET_AUTH_CONTEXT: unique symbol;
export interface WebSocketAuthenticationContext {
    readonly user: Readonly<InternalUser>;
}
export type AuthenticatedSocket<TSocket extends object> = TSocket & {
    readonly [WEB_SOCKET_AUTH_CONTEXT]: WebSocketAuthenticationContext;
};
export type WebSocketUpgradeAuthentication = {
    accepted: true;
    authentication: WebSocketAuthenticationContext;
} | {
    accepted: false;
    statusCode: 400 | 401 | 403 | 503;
};
export type ClientWebSocketMessage = {
    type: 'join';
    roomId: string;
} | {
    type: 'move';
    x: number;
    y: number;
} | {
    type: 'chat';
    text: string;
};
export interface WebSocketMessageRateLimitOptions {
    readonly chatLimit?: number;
    readonly chatWindowMs?: number;
    readonly joinLimit?: number;
    readonly joinWindowMs?: number;
    readonly maxUsers?: number;
    readonly moveLimit?: number;
    readonly moveWindowMs?: number;
    readonly totalLimit?: number;
    readonly totalWindowMs?: number;
}
export interface PublicPlayerState {
    id: string;
    name: string;
    x: number;
    y: number;
}
export interface AuthenticatedConnection<TSocket> {
    readonly authentication: WebSocketAuthenticationContext;
    readonly connectionId: string;
    readonly socket: TSocket;
    currentRoom: string | null;
}
interface RegistrationResult<TSocket> {
    connection: AuthenticatedConnection<TSocket>;
    departedRoomId: string | null;
    replaced: AuthenticatedConnection<TSocket> | null;
}
interface JoinResult {
    departedRoomId: string | null;
    presence: PublicPlayerState;
    roomState: PublicPlayerState[];
}
export declare function authenticateWebSocketUpgrade(input: {
    config: AppSessionConfig | null;
    cookieHeader: string | undefined;
    originHeader: unknown;
    protocolHeader: unknown;
    requestTarget: string | undefined;
    now?: number;
}): WebSocketUpgradeAuthentication;
export declare function attachWebSocketAuthentication<TSocket extends object>(socket: TSocket, authentication: WebSocketAuthenticationContext): AuthenticatedSocket<TSocket>;
export declare function getWebSocketAuthentication(socket: object): WebSocketAuthenticationContext | null;
export declare function parseClientWebSocketMessage(value: unknown): ClientWebSocketMessage | null;
export declare class WebSocketMessageRateLimiter {
    private readonly total;
    private readonly byType;
    constructor(options?: WebSocketMessageRateLimitOptions);
    consume(userId: string, messageType: ClientWebSocketMessage['type'], now?: number): RateLimitDecision;
}
export declare class AuthenticatedMultiplayerState<TSocket> {
    private readonly createConnectionId;
    private readonly activeConnections;
    private readonly rooms;
    constructor(createConnectionId?: () => string);
    register(socket: TSocket, authentication: WebSocketAuthenticationContext): RegistrationResult<TSocket>;
    isCurrent(connection: AuthenticatedConnection<TSocket>): boolean;
    join(connection: AuthenticatedConnection<TSocket>, roomId: string, x: number, y: number): JoinResult | null;
    move(connection: AuthenticatedConnection<TSocket>, x: number, y: number): PublicPlayerState | null;
    disconnect(connection: AuthenticatedConnection<TSocket>): {
        departedRoomId: string | null;
        removedActiveConnection: boolean;
    };
    getRoomState(roomId: string): PublicPlayerState[];
    getConnectionsInRoom(roomId: string): AuthenticatedConnection<TSocket>[];
    private removePresence;
}
export {};
//# sourceMappingURL=webSocketSession.d.ts.map