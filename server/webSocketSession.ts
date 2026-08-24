import { randomUUID } from 'node:crypto';

import {
  extractSessionToken,
  verifyApplicationSession,
  type AppSessionConfig,
  type InternalUser,
} from './appSession.js';

export const MAX_WEBSOCKET_PAYLOAD_BYTES = 16 * 1024;
export const MAX_MOVEMENT_COORDINATE = 10_000;
export const MAX_CHAT_LENGTH = 280;
export const WEB_SOCKET_AUTH_CONTEXT = Symbol('human-world.websocket-auth');

const ROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface WebSocketAuthenticationContext {
  readonly user: Readonly<InternalUser>;
}

export type AuthenticatedSocket<TSocket extends object> = TSocket & {
  readonly [WEB_SOCKET_AUTH_CONTEXT]: WebSocketAuthenticationContext;
};

export type WebSocketUpgradeAuthentication =
  | { accepted: true; authentication: WebSocketAuthenticationContext }
  | { accepted: false; statusCode: 400 | 401 | 403 | 503 };

export type ClientWebSocketMessage =
  | { type: 'join'; roomId: string }
  | { type: 'move'; x: number; y: number }
  | { type: 'chat'; text: string };

export interface PublicPlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
}

interface RoomPresence extends PublicPlayerState {
  connectionId: string;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: string[]) {
  return Object.keys(value).sort().join(',') === [...expectedKeys].sort().join(',');
}

function toPublicPresence(presence: RoomPresence): PublicPlayerState {
  return {
    id: presence.id,
    name: presence.name,
    x: presence.x,
    y: presence.y,
  };
}

export function authenticateWebSocketUpgrade(input: {
  config: AppSessionConfig | null;
  cookieHeader: string | undefined;
  originHeader: unknown;
  protocolHeader: unknown;
  requestTarget: string | undefined;
  now?: number;
}): WebSocketUpgradeAuthentication {
  if (!input.config) return { accepted: false, statusCode: 503 };
  if (typeof input.originHeader !== 'string' || input.originHeader !== input.config.appOrigin) {
    return { accepted: false, statusCode: 403 };
  }
  if (input.requestTarget !== '/' || input.protocolHeader !== undefined) {
    return { accepted: false, statusCode: 400 };
  }

  const token = extractSessionToken(input.cookieHeader, input.config.isProduction);
  if (!token) return { accepted: false, statusCode: 401 };

  const user = verifyApplicationSession(token, input.config.sessionSecret, input.now);
  if (!user) return { accepted: false, statusCode: 401 };

  return {
    accepted: true,
    authentication: Object.freeze({ user: Object.freeze({ ...user }) }),
  };
}

export function attachWebSocketAuthentication<TSocket extends object>(
  socket: TSocket,
  authentication: WebSocketAuthenticationContext,
): AuthenticatedSocket<TSocket> {
  const immutableAuthentication = Object.freeze({
    user: Object.freeze({ ...authentication.user }),
  });

  Object.defineProperty(socket, WEB_SOCKET_AUTH_CONTEXT, {
    configurable: false,
    enumerable: false,
    value: immutableAuthentication,
    writable: false,
  });

  return socket as AuthenticatedSocket<TSocket>;
}

export function getWebSocketAuthentication(
  socket: object,
): WebSocketAuthenticationContext | null {
  const value = (socket as Partial<AuthenticatedSocket<object>>)[WEB_SOCKET_AUTH_CONTEXT];
  return value ?? null;
}

export function parseClientWebSocketMessage(value: unknown): ClientWebSocketMessage | null {
  if (!isPlainObject(value) || typeof value.type !== 'string') return null;

  if (value.type === 'join') {
    if (!hasExactKeys(value, ['type', 'roomId'])) return null;
    if (typeof value.roomId !== 'string' || !ROOM_ID_PATTERN.test(value.roomId)) return null;
    return { type: 'join', roomId: value.roomId };
  }

  if (value.type === 'move') {
    if (!hasExactKeys(value, ['type', 'x', 'y'])) return null;
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
    if (!hasExactKeys(value, ['type', 'text']) || typeof value.text !== 'string') return null;
    const text = value.text.trim();
    if (text.length === 0 || text.length > MAX_CHAT_LENGTH) return null;
    return { type: 'chat', text };
  }

  return null;
}

export class AuthenticatedMultiplayerState<TSocket> {
  private readonly activeConnections = new Map<string, AuthenticatedConnection<TSocket>>();
  private readonly rooms = new Map<string, Map<string, RoomPresence>>();

  constructor(private readonly createConnectionId: () => string = randomUUID) {}

  register(
    socket: TSocket,
    authentication: WebSocketAuthenticationContext,
  ): RegistrationResult<TSocket> {
    const userId = authentication.user.id;
    const replaced = this.activeConnections.get(userId) ?? null;
    const departedRoomId = replaced ? this.removePresence(replaced) : null;
    const connection: AuthenticatedConnection<TSocket> = {
      authentication,
      connectionId: this.createConnectionId(),
      socket,
      currentRoom: null,
    };

    this.activeConnections.set(userId, connection);
    return { connection, departedRoomId, replaced };
  }

  isCurrent(connection: AuthenticatedConnection<TSocket>): boolean {
    return this.activeConnections.get(connection.authentication.user.id)?.connectionId
      === connection.connectionId;
  }

  join(
    connection: AuthenticatedConnection<TSocket>,
    roomId: string,
    x: number,
    y: number,
  ): JoinResult | null {
    if (!this.isCurrent(connection)
      || !ROOM_ID_PATTERN.test(roomId)
      || !Number.isFinite(x)
      || !Number.isFinite(y)
      || Math.abs(x) > MAX_MOVEMENT_COORDINATE
      || Math.abs(y) > MAX_MOVEMENT_COORDINATE) {
      return null;
    }

    const departedRoomId = this.removePresence(connection);
    const room = this.rooms.get(roomId) ?? new Map<string, RoomPresence>();
    const presence: RoomPresence = {
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

  move(
    connection: AuthenticatedConnection<TSocket>,
    x: number,
    y: number,
  ): PublicPlayerState | null {
    if (!this.isCurrent(connection) || !connection.currentRoom) return null;
    if (!Number.isFinite(x)
      || !Number.isFinite(y)
      || Math.abs(x) > MAX_MOVEMENT_COORDINATE
      || Math.abs(y) > MAX_MOVEMENT_COORDINATE) {
      return null;
    }

    const presence = this.rooms.get(connection.currentRoom)?.get(connection.authentication.user.id);
    if (!presence || presence.connectionId !== connection.connectionId) return null;
    presence.x = x;
    presence.y = y;
    return toPublicPresence(presence);
  }

  disconnect(connection: AuthenticatedConnection<TSocket>) {
    const departedRoomId = this.removePresence(connection);
    const userId = connection.authentication.user.id;
    const isCurrent = this.activeConnections.get(userId)?.connectionId === connection.connectionId;
    if (isCurrent) this.activeConnections.delete(userId);
    return { departedRoomId, removedActiveConnection: isCurrent };
  }

  getRoomState(roomId: string): PublicPlayerState[] {
    return Array.from(this.rooms.get(roomId)?.values() ?? [], toPublicPresence);
  }

  getConnectionsInRoom(roomId: string): AuthenticatedConnection<TSocket>[] {
    return Array.from(this.activeConnections.values()).filter((connection) => (
      connection.currentRoom === roomId && this.isCurrent(connection)
    ));
  }

  private removePresence(connection: AuthenticatedConnection<TSocket>): string | null {
    const roomId = connection.currentRoom;
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    const presence = room?.get(connection.authentication.user.id);
    connection.currentRoom = null;
    if (!room || !presence || presence.connectionId !== connection.connectionId) return null;

    room.delete(connection.authentication.user.id);
    if (room.size === 0) this.rooms.delete(roomId);
    return roomId;
  }
}
