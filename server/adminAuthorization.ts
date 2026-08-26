import type { AppSessionConfig, InternalUser } from './appSession.js';
import { extractSessionToken, verifyApplicationSession } from './appSession.js';
import { isInternalUserId, isRoomId, type RoomRecord } from './persistence.js';

export type AdminRole = 'owner' | 'editor';
export type AdminCapability = 'admin:access' | 'rooms:write' | 'roles:manage';

const ROLE_CAPABILITIES = {
  owner: ['admin:access', 'rooms:write', 'roles:manage'],
  editor: ['admin:access', 'rooms:write'],
} as const satisfies Readonly<Record<AdminRole, readonly AdminCapability[]>>;

const ROLE_VALUES = new Set<AdminRole>(['owner', 'editor']);
const ROOM_TYPES = /^[a-z][a-z0-9-]{0,31}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const CATALOG_ID = /^[a-z][A-Za-z0-9-]{0,63}$/;
const LAND_STATUSES = new Set(['public', 'available', 'owned', 'reserved']);
const MATERIALS = new Set(['stone', 'avenue', 'fountain', 'event', 'shop', 'cafe', 'garden', 'community', 'entrance']);
const OBJECT_CATEGORIES = new Set(['building', 'furniture', 'prop', 'vegetation', 'landmark', 'world-item']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_LAYOUT_BYTES = 240 * 1024;
const MAX_COORDINATE = 10_000;

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

export class AdminVersionConflictError extends Error {
  constructor() { super('Admin resource version conflict'); }
}

export class AdminInvariantError extends Error {
  constructor() { super('Admin invariant rejected'); }
}

export type AdminAuthenticationResult =
  | { accepted: true; user: InternalUser; session: AdminSession }
  | { accepted: false; statusCode: 401 | 403 | 503 };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function finiteNumber(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function finiteInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && finiteNumber(value, minimum, maximum);
}

function validPosition(value: unknown): boolean {
  if (!isPlainObject(value) || !hasOnlyKeys(value, ['x', 'y', 'z'])) return false;
  return finiteNumber(value.x, -MAX_COORDINATE, MAX_COORDINATE)
    && finiteNumber(value.y, -MAX_COORDINATE, MAX_COORDINATE)
    && (value.z === undefined || finiteNumber(value.z, -100, 100));
}

function safeJson(value: unknown, depth = 0): boolean {
  if (depth > 14) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 1_024 && !/session_[0-9a-fA-F]{128}/.test(value);
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) <= 0xffffff;
  if (Array.isArray(value)) return value.length <= 4_096 && value.every((entry) => safeJson(entry, depth + 1));
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length <= 64
    && keys.every((key) => key.length <= 64 && !FORBIDDEN_KEYS.has(key))
    && Object.values(value).every((entry) => safeJson(entry, depth + 1));
}

function validInteraction(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isPlainObject(value) || !hasOnlyKeys(value, ['title', 'description', 'actionLabel', 'action', 'targetId', 'icon', 'effect', 'facing'])) return false;
  return typeof value.title === 'string' && value.title.length >= 1 && value.title.length <= 80
    && typeof value.description === 'string' && value.description.length <= 280
    && typeof value.actionLabel === 'string' && value.actionLabel.length >= 1 && value.actionLabel.length <= 80
    && typeof value.action === 'string' && ['enter-room', 'view-profile', 'inspect', 'sit', 'use'].includes(value.action)
    && (value.targetId === undefined || (typeof value.targetId === 'string' && IDENTIFIER.test(value.targetId)))
    && (value.icon === undefined || (typeof value.icon === 'string' && value.icon.length <= 8))
    && (value.effect === undefined || (typeof value.effect === 'string' && ['fountain-wish', 'join-event', 'read-events', 'view-placement'].includes(value.effect)))
    && (value.facing === undefined || (typeof value.facing === 'string' && ['north', 'south', 'east', 'west'].includes(value.facing)));
}

function validCollision(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isPlainObject(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'circle') {
    return hasExactKeys(value, ['kind', 'radius', 'x', 'y'])
      && finiteNumber(value.x, -MAX_COORDINATE, MAX_COORDINATE)
      && finiteNumber(value.y, -MAX_COORDINATE, MAX_COORDINATE)
      && finiteNumber(value.radius, 0.01, 1_000);
  }
  return value.kind === 'rect' && hasExactKeys(value, ['height', 'kind', 'width', 'x', 'y'])
    && finiteNumber(value.x, -MAX_COORDINATE, MAX_COORDINATE)
    && finiteNumber(value.y, -MAX_COORDINATE, MAX_COORDINATE)
    && finiteNumber(value.width, 0.01, 1_000)
    && finiteNumber(value.height, 0.01, 1_000);
}

function validRoomObject(value: unknown): boolean {
  if (!isPlainObject(value) || !safeJson(value)) return false;
  if (typeof value.id !== 'string' || !IDENTIFIER.test(value.id)) return false;
  if (value.catalogId !== undefined && (typeof value.catalogId !== 'string' || !CATALOG_ID.test(value.catalogId))) return false;
  if (typeof value.asset !== 'string' || value.asset.length > 300 || !value.asset.startsWith('/assets/world/')) return false;
  if (typeof value.category !== 'string' || !OBJECT_CATEGORIES.has(value.category)
    || !validPosition(value.position) || !finiteNumber(value.displayWidth, 1, 2_000)
    || !validCollision(value.collision)) return false;
  if (value.direction !== undefined && !finiteInteger(value.direction, 0, 359)) return false;
  if (value.state !== undefined && (typeof value.state !== 'string' || !CATALOG_ID.test(value.state))) return false;
  return validInteraction(value.interaction);
}

function validAvatar(value: unknown): boolean {
  if (!isPlainObject(value) || !safeJson(value)) return false;
  return typeof value.id === 'string' && IDENTIFIER.test(value.id)
    && typeof value.name === 'string' && value.name.length >= 1 && value.name.length <= 80
    && validPosition(value.position);
}

function validEvent(value: unknown): boolean {
  if (!isPlainObject(value) || !safeJson(value)) return false;
  return typeof value.id === 'string' && IDENTIFIER.test(value.id)
    && typeof value.title === 'string' && value.title.length >= 1 && value.title.length <= 120
    && Array.isArray(value.objectIds) && value.objectIds.length <= 128
    && value.objectIds.every((id) => typeof id === 'string' && IDENTIFIER.test(id));
}

function validLayout(layout: unknown, roomId: string): boolean {
  if (!isPlainObject(layout) || !safeJson(layout)) return false;
  if (!hasOnlyKeys(layout, ['id', 'name', 'geometry', 'floor', 'objects', 'contextObjects', 'avatars', 'spaces', 'events', 'districts', 'studio', 'ui'])) return false;
  if (layout.id !== roomId || typeof layout.name !== 'string' || layout.name.length < 1 || layout.name.length > 80) return false;
  if (!isPlainObject(layout.geometry) || !hasExactKeys(layout.geometry, ['cells', 'walls', 'exits', 'spawn', 'maxStepHeight'])) return false;
  const { cells, walls, exits, spawn, maxStepHeight } = layout.geometry;
  if (!Array.isArray(cells) || cells.length < 1 || cells.length > 4_096
    || !Array.isArray(walls) || walls.length > 512
    || !Array.isArray(exits) || exits.length > 64
    || !validPosition(spawn) || !finiteNumber(maxStepHeight, 0, 100)) return false;
  if (!cells.every((cell) => isPlainObject(cell) && hasExactKeys(cell, ['x', 'y', 'elevation', 'material', 'walkable'])
    && finiteInteger(cell.x, -MAX_COORDINATE, MAX_COORDINATE)
    && finiteInteger(cell.y, -MAX_COORDINATE, MAX_COORDINATE)
    && finiteNumber(cell.elevation, -100, 100)
    && typeof cell.material === 'string' && MATERIALS.has(cell.material)
    && typeof cell.walkable === 'boolean')) return false;
  if (!walls.every((wall) => isPlainObject(wall) && safeJson(wall) && typeof wall.id === 'string' && IDENTIFIER.test(wall.id)
    && validPosition(wall.from) && validPosition(wall.to))) return false;
  if (!exits.every((exit) => isPlainObject(exit) && safeJson(exit) && typeof exit.id === 'string' && IDENTIFIER.test(exit.id)
    && validPosition(exit.position) && typeof exit.targetRoomId === 'string' && isRoomId(exit.targetRoomId))) return false;
  if (!Array.isArray(layout.objects) || layout.objects.length > 512 || !layout.objects.every(validRoomObject)) return false;
  if (layout.contextObjects !== undefined && (!Array.isArray(layout.contextObjects) || layout.contextObjects.length > 256 || !layout.contextObjects.every(validRoomObject))) return false;
  if (!Array.isArray(layout.avatars) || layout.avatars.length > 128 || !layout.avatars.every(validAvatar)) return false;
  if (layout.events !== undefined && (!Array.isArray(layout.events) || layout.events.length > 128 || !layout.events.every(validEvent))) return false;
  if (layout.spaces !== undefined && (!Array.isArray(layout.spaces) || layout.spaces.length > 128)) return false;
  if (layout.districts !== undefined && (!Array.isArray(layout.districts) || layout.districts.length > 128)) return false;
  const worldIds = [
    ...layout.objects.map((entry) => (entry as Record<string, unknown>).id),
    ...(Array.isArray(layout.contextObjects) ? layout.contextObjects.map((entry) => (entry as Record<string, unknown>).id) : []),
    ...layout.avatars.map((entry) => (entry as Record<string, unknown>).id),
  ];
  if (new Set(worldIds).size !== worldIds.length) return false;
  const cellIds = cells.map((cell) => `${(cell as Record<string, unknown>).x}:${(cell as Record<string, unknown>).y}`);
  if (new Set(cellIds).size !== cellIds.length) return false;
  return isPlainObject(layout.floor) && isPlainObject(layout.studio) && isPlainObject(layout.ui);
}

export function capabilitiesForRole(role: AdminRole): readonly AdminCapability[] {
  return ROLE_CAPABILITIES[role];
}

export function hasCapability(session: AdminSession, capability: AdminCapability): boolean {
  return session.capabilities.includes(capability);
}

export function createAdminConfig(environment: Record<string, string | undefined>): AdminConfig | null {
  const isDevelopment = environment.NODE_ENV === 'development';
  const developmentAdminEnabled = environment.ENABLE_DEV_ADMIN === 'true';
  if (!isDevelopment && developmentAdminEnabled) return null;
  if (environment.ENABLE_DEV_ADMIN !== undefined && !['true', 'false'].includes(environment.ENABLE_DEV_ADMIN)) return null;

  const raw = environment.ADMIN_BOOTSTRAP_USER_IDS ?? '';
  if (raw !== raw.trim()) return null;
  const entries = raw === '' ? [] : raw.split(',');
  if (entries.some((entry) => !isInternalUserId(entry)) || new Set(entries).size !== entries.length) return null;
  return { bootstrapUserIds: new Set(entries), developmentAdminEnabled };
}

export function shouldBootstrapOwner(config: AdminConfig, userId: string): boolean {
  return config.bootstrapUserIds.has(userId) || config.developmentAdminEnabled;
}

export async function authenticateAdminRequest(input: {
  appSessionConfig: AppSessionConfig | null;
  repository: AdminRepository | null;
  cookieHeader: string | undefined;
  originHeader: string | undefined;
  now?: number;
}): Promise<AdminAuthenticationResult> {
  if (!input.appSessionConfig || !input.repository) return { accepted: false, statusCode: 503 };
  if (input.originHeader !== input.appSessionConfig.appOrigin) return { accepted: false, statusCode: 403 };
  const token = extractSessionToken(input.cookieHeader, input.appSessionConfig.isProduction);
  const user = token ? verifyApplicationSession(token, input.appSessionConfig.sessionSecret, input.now) : null;
  if (!user) return { accepted: false, statusCode: 401 };
  try {
    const role = await input.repository.getRole(user.id);
    if (!role) return { accepted: false, statusCode: 403 };
    return { accepted: true, user, session: Object.freeze({ role, capabilities: capabilitiesForRole(role) }) };
  } catch {
    return { accepted: false, statusCode: 503 };
  }
}

export function parseRoleInput(value: unknown): AdminRole | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['role'])) return null;
  return typeof value.role === 'string' && ROLE_VALUES.has(value.role as AdminRole) ? value.role as AdminRole : null;
}

export function parseRoomMetadataInput(value: unknown, routeRoomId: string): AdminRoomMetadataInput | null {
  const keys = ['capacity', 'isPublic', 'landStatus', 'left', 'name', 'priceHum', 'roomId', 'top', 'type'];
  if (!isRoomId(routeRoomId) || !isPlainObject(value) || !hasExactKeys(value, keys) || value.roomId !== routeRoomId) return null;
  if (typeof value.name !== 'string' || value.name !== value.name.trim() || value.name.length < 1 || value.name.length > 80
    || typeof value.type !== 'string' || !ROOM_TYPES.test(value.type)
    || !finiteInteger(value.capacity, 1, 250) || typeof value.isPublic !== 'boolean'
    || !finiteNumber(value.top, 0, 100) || !finiteNumber(value.left, 0, 100)
    || typeof value.landStatus !== 'string' || !LAND_STATUSES.has(value.landStatus)
    || (value.priceHum !== null && !finiteNumber(value.priceHum, 0, 1_000_000_000))) return null;
  return value as unknown as AdminRoomMetadataInput;
}

export function parsePublishRoomLayoutInput(value: unknown, routeRoomId: string): PublishRoomLayoutInput | null {
  if (!isRoomId(routeRoomId) || !isPlainObject(value) || !hasExactKeys(value, ['expectedVersion', 'layout', 'roomId']) || value.roomId !== routeRoomId) return null;
  if (!finiteInteger(value.expectedVersion, 0, Number.MAX_SAFE_INTEGER)) return null;
  let size: number;
  try { size = Buffer.byteLength(JSON.stringify(value.layout), 'utf8'); } catch { return null; }
  if (size > MAX_LAYOUT_BYTES || !validLayout(value.layout, routeRoomId)) return null;
  return { expectedVersion: value.expectedVersion, layout: value.layout, roomId: routeRoomId };
}

export function parseResetRoomLayoutInput(value: unknown, routeRoomId: string): ResetRoomLayoutInput | null {
  if (!isRoomId(routeRoomId) || !isPlainObject(value) || !hasExactKeys(value, ['expectedVersion', 'roomId']) || value.roomId !== routeRoomId) return null;
  return finiteInteger(value.expectedVersion, 0, Number.MAX_SAFE_INTEGER)
    ? { expectedVersion: value.expectedVersion, roomId: routeRoomId }
    : null;
}
