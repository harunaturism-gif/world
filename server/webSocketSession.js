import { randomUUID } from 'node:crypto';
import { extractSessionToken, verifyApplicationSession, } from './appSession.js';
import { FixedWindowRateLimiter } from './rateLimit.js';
export const MAX_WEBSOCKET_PAYLOAD_BYTES = 16 * 1024;
export const MAX_MOVEMENT_COORDINATE = 10_000;
export const MAX_CHAT_LENGTH = 280;
export const WEB_SOCKET_TOTAL_RATE_LIMIT = 240;
export const WEB_SOCKET_TOTAL_RATE_WINDOW_MS = 10_000;
export const WEB_SOCKET_JOIN_RATE_LIMIT = 6;
export const WEB_SOCKET_JOIN_RATE_WINDOW_MS = 30_000;
export const WEB_SOCKET_MOVE_RATE_LIMIT = 200;
export const WEB_SOCKET_MOVE_RATE_WINDOW_MS = 10_000;
export const WEB_SOCKET_CHAT_RATE_LIMIT = 8;
export const WEB_SOCKET_CHAT_RATE_WINDOW_MS = 30_000;
export const WEB_SOCKET_AUTH_CONTEXT = Symbol('human-world.websocket-auth');
const ROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
function isPlainObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function hasExactKeys(value, expectedKeys) {
    return Object.keys(value).sort().join(',') === [...expectedKeys].sort().join(',');
}
function toPublicPresence(presence) {
    return {
        id: presence.id,
        name: presence.name,
        x: presence.x,
        y: presence.y,
    };
}
export function authenticateWebSocketUpgrade(input) {
    if (!input.config)
        return { accepted: false, statusCode: 503 };
    if (typeof input.originHeader !== 'string' || input.originHeader !== input.config.appOrigin) {
        return { accepted: false, statusCode: 403 };
    }
    if (input.requestTarget !== '/' || input.protocolHeader !== undefined) {
        return { accepted: false, statusCode: 400 };
    }
    const token = extractSessionToken(input.cookieHeader, input.config.isProduction);
    if (!token)
        return { accepted: false, statusCode: 401 };
    const user = verifyApplicationSession(token, input.config.sessionSecret, input.now);
    if (!user)
        return { accepted: false, statusCode: 401 };
    return {
        accepted: true,
        authentication: Object.freeze({ user: Object.freeze({ ...user }) }),
    };
}
export function attachWebSocketAuthentication(socket, authentication) {
    const immutableAuthentication = Object.freeze({
        user: Object.freeze({ ...authentication.user }),
    });
    Object.defineProperty(socket, WEB_SOCKET_AUTH_CONTEXT, {
        configurable: false,
        enumerable: false,
        value: immutableAuthentication,
        writable: false,
    });
    return socket;
}
export function getWebSocketAuthentication(socket) {
    const value = socket[WEB_SOCKET_AUTH_CONTEXT];
    return value ?? null;
}
export function parseClientWebSocketMessage(value) {
    if (!isPlainObject(value) || typeof value.type !== 'string')
        return null;
    if (value.type === 'join') {
        if (!hasExactKeys(value, ['type', 'roomId']))
            return null;
        if (typeof value.roomId !== 'string' || !ROOM_ID_PATTERN.test(value.roomId))
            return null;
        return { type: 'join', roomId: value.roomId };
    }
    if (value.type === 'move') {
        if (!hasExactKeys(value, ['type', 'x', 'y']))
            return null;
        if (typeof value.x !== 'number'
            || typeof value.y !== 'number'
            || !Number.isFinite(value.x)
            || !Number.isFinite(value.y)
            || Math.abs(value.x) > MAX_MOVEMENT_COORDINATE
            || Math.abs(value.y) > MAX_MOVEMENT_COORDINATE) {
            return null;
        }
        return { type: 'move', x: value.x, y: value.y };
    }
    if (value.type === 'chat') {
        if (!hasExactKeys(value, ['type', 'text']) || typeof value.text !== 'string')
            return null;
        const text = value.text.trim();
        if (text.length === 0 || text.length > MAX_CHAT_LENGTH)
            return null;
        return { type: 'chat', text };
    }
    return null;
}
export class WebSocketMessageRateLimiter {
    total;
    byType;
    constructor(options = {}) {
        const maxKeys = options.maxUsers ?? 10_000;
        this.total = new FixedWindowRateLimiter({
            limit: options.totalLimit ?? WEB_SOCKET_TOTAL_RATE_LIMIT,
            maxKeys,
            windowMs: options.totalWindowMs ?? WEB_SOCKET_TOTAL_RATE_WINDOW_MS,
        });
        this.byType = {
            chat: new FixedWindowRateLimiter({
                limit: options.chatLimit ?? WEB_SOCKET_CHAT_RATE_LIMIT,
                maxKeys,
                windowMs: options.chatWindowMs ?? WEB_SOCKET_CHAT_RATE_WINDOW_MS,
            }),
            join: new FixedWindowRateLimiter({
                limit: options.joinLimit ?? WEB_SOCKET_JOIN_RATE_LIMIT,
                maxKeys,
                windowMs: options.joinWindowMs ?? WEB_SOCKET_JOIN_RATE_WINDOW_MS,
            }),
            move: new FixedWindowRateLimiter({
                limit: options.moveLimit ?? WEB_SOCKET_MOVE_RATE_LIMIT,
                maxKeys,
                windowMs: options.moveWindowMs ?? WEB_SOCKET_MOVE_RATE_WINDOW_MS,
            }),
        };
    }
    consume(userId, messageType, now = Date.now()) {
        const totalDecision = this.total.consume(userId, now);
        if (!totalDecision.allowed)
            return totalDecision;
        return this.byType[messageType].consume(userId, now);
    }
}
export class AuthenticatedMultiplayerState {
    createConnectionId;
    activeConnections = new Map();
    rooms = new Map();
    constructor(createConnectionId = randomUUID) {
        this.createConnectionId = createConnectionId;
    }
    register(socket, authentication) {
        const userId = authentication.user.id;
        const replaced = this.activeConnections.get(userId) ?? null;
        const departedRoomId = replaced ? this.removePresence(replaced) : null;
        const connection = {
            authentication,
            connectionId: this.createConnectionId(),
            socket,
            currentRoom: null,
        };
        this.activeConnections.set(userId, connection);
        return { connection, departedRoomId, replaced };
    }
    isCurrent(connection) {
        return this.activeConnections.get(connection.authentication.user.id)?.connectionId
            === connection.connectionId;
    }
    join(connection, roomId, x, y) {
        if (!this.isCurrent(connection)
            || !ROOM_ID_PATTERN.test(roomId)
            || !Number.isFinite(x)
            || !Number.isFinite(y)
            || Math.abs(x) > MAX_MOVEMENT_COORDINATE
            || Math.abs(y) > MAX_MOVEMENT_COORDINATE) {
            return null;
        }
        const departedRoomId = this.removePresence(connection);
        const room = this.rooms.get(roomId) ?? new Map();
        const presence = {
            connectionId: connection.connectionId,
            id: connection.authentication.user.id,
            name: connection.authentication.user.username,
            x,
            y,
        };
        room.set(presence.id, presence);
        this.rooms.set(roomId, room);
        connection.currentRoom = roomId;
        return {
            departedRoomId,
            presence: toPublicPresence(presence),
            roomState: Array.from(room.values(), toPublicPresence),
        };
    }
    move(connection, x, y) {
        if (!this.isCurrent(connection) || !connection.currentRoom)
            return null;
        if (!Number.isFinite(x)
            || !Number.isFinite(y)
            || Math.abs(x) > MAX_MOVEMENT_COORDINATE
            || Math.abs(y) > MAX_MOVEMENT_COORDINATE) {
            return null;
        }
        const presence = this.rooms.get(connection.currentRoom)?.get(connection.authentication.user.id);
        if (!presence || presence.connectionId !== connection.connectionId)
            return null;
        presence.x = x;
        presence.y = y;
        return toPublicPresence(presence);
    }
    disconnect(connection) {
        const departedRoomId = this.removePresence(connection);
        const userId = connection.authentication.user.id;
        const isCurrent = this.activeConnections.get(userId)?.connectionId === connection.connectionId;
        if (isCurrent)
            this.activeConnections.delete(userId);
        return { departedRoomId, removedActiveConnection: isCurrent };
    }
    getRoomState(roomId) {
        return Array.from(this.rooms.get(roomId)?.values() ?? [], toPublicPresence);
    }
    getConnectionsInRoom(roomId) {
        return Array.from(this.activeConnections.values()).filter((connection) => (connection.currentRoom === roomId && this.isCurrent(connection)));
    }
    removePresence(connection) {
        const roomId = connection.currentRoom;
        if (!roomId)
            return null;
        const room = this.rooms.get(roomId);
        const presence = room?.get(connection.authentication.user.id);
        connection.currentRoom = null;
        if (!room || !presence || presence.connectionId !== connection.connectionId)
            return null;
        room.delete(connection.authentication.user.id);
        if (room.size === 0)
            this.rooms.delete(roomId);
        return roomId;
    }
}
//# sourceMappingURL=webSocketSession.js.map