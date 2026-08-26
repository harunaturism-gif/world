import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { deriveInternalUser, serializeSessionCookie, signApplicationSession } from './appSession.js';
import {
  AdminInvariantError,
  AdminVersionConflictError,
  authenticateAdminRequest,
  capabilitiesForRole,
  createAdminConfig,
  parsePublishRoomLayoutInput,
  parseResetRoomLayoutInput,
  parseRoleInput,
  parseRoomMetadataInput,
  shouldBootstrapOwner,
} from './adminAuthorization.js';
import { createAdminRouter } from './adminRoutes.js';
import { DevelopmentAdminRepository } from './developmentAdminRepository.js';

const { sign: signJwt } = jsonwebtoken;
const sessionSecret = 'session-secret-7Px!mQ2#vN8$kR4@tY6&wB9';
const identitySecret = 'identity-secret-3Fd!zK8#pW5$gT9@rM2&xC7';
const origin = 'https://world.example';
const now = Math.floor(Date.now() / 1000);
const owner = deriveInternalUser(`session_${'11'.repeat(64)}`, identitySecret);
const editor = deriveInternalUser(`session_${'22'.repeat(64)}`, identitySecret);
const ordinary = deriveInternalUser(`session_${'33'.repeat(64)}`, identitySecret);
const secondOwner = deriveInternalUser(`session_${'44'.repeat(64)}`, identitySecret);
const config = { appOrigin: origin, identitySecret, isProduction: true, sessionSecret };

function tokenFor(user, options = {}) {
  return signApplicationSession(user, sessionSecret, { now, jti: options.jti ?? crypto.randomUUID(), lifetimeSeconds: options.lifetimeSeconds ?? 3600 });
}

function cookieFor(user, options) {
  return serializeSessionCookie(tokenFor(user, options), true).split(';')[0];
}

function validLayout(roomId = 'central-plaza') {
  return {
    id: roomId,
    name: 'Central Plaza',
    geometry: {
      cells: [{ x: 0, y: 0, elevation: 0, material: 'stone', walkable: true }],
      walls: [],
      exits: [],
      spawn: { x: 0, y: 0 },
      maxStepHeight: 1,
    },
    floor: {},
    objects: [{ id: 'bench-1', catalogId: 'bench', asset: '/assets/world/bench.png', category: 'furniture', position: { x: 1, y: 1 }, displayWidth: 100 }],
    avatars: [],
    studio: {},
    ui: {},
  };
}

function validMetadata(roomId = 'central-plaza') {
  return { roomId, name: 'Central Plaza', type: 'plaza', capacity: 50, isPublic: true, top: 48, left: 50, landStatus: 'public', priceHum: null };
}

test('role-to-capability mapping is centralized and least privilege', () => {
  assert.deepEqual(capabilitiesForRole('owner'), ['admin:access', 'rooms:write', 'roles:manage']);
  assert.deepEqual(capabilitiesForRole('editor'), ['admin:access', 'rooms:write']);
});

test('bootstrap configuration accepts only unique internal IDs and explicit development enablement', () => {
  assert.deepEqual([...createAdminConfig({ NODE_ENV: 'production', ADMIN_BOOTSTRAP_USER_IDS: `${owner.id},${secondOwner.id}` }).bootstrapUserIds], [owner.id, secondOwner.id]);
  assert.equal(createAdminConfig({ NODE_ENV: 'production', ADMIN_BOOTSTRAP_USER_IDS: `${owner.id},${owner.id}` }), null);
  assert.equal(createAdminConfig({ NODE_ENV: 'production', ADMIN_BOOTSTRAP_USER_IDS: 'session_bad' }), null);
  assert.equal(createAdminConfig({ NODE_ENV: 'production', ENABLE_DEV_ADMIN: 'true' }), null);
  assert.equal(createAdminConfig({ NODE_ENV: 'development', ENABLE_DEV_ADMIN: 'yes' }), null);
  assert.equal(createAdminConfig({ NODE_ENV: 'development', ENABLE_DEV_ADMIN: 'true' }).developmentAdminEnabled, true);
});

test('bootstrap selection uses internal IDs rather than usernames or World sessions', () => {
  const adminConfig = createAdminConfig({ NODE_ENV: 'production', ADMIN_BOOTSTRAP_USER_IDS: owner.id });
  assert.equal(shouldBootstrapOwner(adminConfig, owner.id), true);
  assert.equal(shouldBootstrapOwner(adminConfig, ordinary.id), false);
});

test('fresh server-side role lookup authorizes owner and editor but denies ordinary users', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  await repository.setRole(owner.id, editor.id, 'editor');
  assert.equal((await authenticateAdminRequest({ appSessionConfig: config, repository, cookieHeader: cookieFor(owner), originHeader: origin, now })).accepted, true);
  const editorResult = await authenticateAdminRequest({ appSessionConfig: config, repository, cookieHeader: cookieFor(editor), originHeader: origin, now });
  assert.equal(editorResult.accepted, true);
  assert.deepEqual(editorResult.session.capabilities, ['admin:access', 'rooms:write']);
  assert.deepEqual(await authenticateAdminRequest({ appSessionConfig: config, repository, cookieHeader: cookieFor(ordinary), originHeader: origin, now }), { accepted: false, statusCode: 403 });
});

test('admin authentication rejects missing or wrong Origin before authorization', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  assert.deepEqual(await authenticateAdminRequest({ appSessionConfig: config, repository, cookieHeader: cookieFor(owner), originHeader: undefined, now }), { accepted: false, statusCode: 403 });
  assert.deepEqual(await authenticateAdminRequest({ appSessionConfig: config, repository, cookieHeader: cookieFor(owner), originHeader: 'https://evil.example', now }), { accepted: false, statusCode: 403 });
});

test('admin authentication rejects missing, duplicate, malformed, tampered and expired cookies', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  const cookie = cookieFor(owner);
  const expired = serializeSessionCookie(signApplicationSession(owner, sessionSecret, { now: now - 100, lifetimeSeconds: 1, jti: crypto.randomUUID() }), true).split(';')[0];
  for (const cookieHeader of [undefined, `${cookie}; ${cookie}`, '__Host-human_world_session=bad', `${cookie.slice(0, -3)}bad`, expired]) {
    assert.deepEqual(await authenticateAdminRequest({ appSessionConfig: config, repository, cookieHeader, originHeader: origin, now }), { accepted: false, statusCode: 401 });
  }
});

test('strict role input rejects forged identity, capabilities and malformed roles', () => {
  assert.equal(parseRoleInput({ role: 'editor' }), 'editor');
  assert.equal(parseRoleInput({ role: 'admin' }), null);
  assert.equal(parseRoleInput({ role: 'editor', userId: ordinary.id }), null);
  assert.equal(parseRoleInput({ role: 'editor', capabilities: ['roles:manage'] }), null);
});

test('strict room metadata validation rejects forged identity and invalid bounds', () => {
  assert.deepEqual(parseRoomMetadataInput(validMetadata(), 'central-plaza'), validMetadata());
  assert.equal(parseRoomMetadataInput({ ...validMetadata(), userId: ordinary.id }, 'central-plaza'), null);
  assert.equal(parseRoomMetadataInput({ ...validMetadata(), role: 'owner' }, 'central-plaza'), null);
  assert.equal(parseRoomMetadataInput({ ...validMetadata(), capacity: 251 }, 'central-plaza'), null);
  assert.equal(parseRoomMetadataInput({ ...validMetadata(), top: Infinity }, 'central-plaza'), null);
  assert.equal(parseRoomMetadataInput({ ...validMetadata(), priceHum: -1 }, 'central-plaza'), null);
  assert.equal(parseRoomMetadataInput(validMetadata('lunas-cafe'), 'central-plaza'), null);
});

test('strict layout validation enforces route match, geometry bounds and catalog identifiers', () => {
  assert.ok(parsePublishRoomLayoutInput({ roomId: 'central-plaza', expectedVersion: 0, layout: validLayout() }, 'central-plaza'));
  assert.equal(parsePublishRoomLayoutInput({ roomId: 'lunas-cafe', expectedVersion: 0, layout: validLayout() }, 'central-plaza'), null);
  const badCoordinate = validLayout(); badCoordinate.geometry.cells[0].x = Infinity;
  assert.equal(parsePublishRoomLayoutInput({ roomId: 'central-plaza', expectedVersion: 0, layout: badCoordinate }, 'central-plaza'), null);
  const badCatalog = validLayout(); badCatalog.objects[0].catalogId = '../admin';
  assert.equal(parsePublishRoomLayoutInput({ roomId: 'central-plaza', expectedVersion: 0, layout: badCatalog }, 'central-plaza'), null);
  const badInteraction = validLayout(); badInteraction.objects[0].interaction = { title: 'Bench', description: 'Sit', actionLabel: 'Sit', action: 'sit', effect: 'grant-owner' };
  assert.equal(parsePublishRoomLayoutInput({ roomId: 'central-plaza', expectedVersion: 0, layout: badInteraction }, 'central-plaza'), null);
});

test('oversized and prototype-polluting layouts fail closed', () => {
  const oversized = validLayout(); oversized.ui = { help: 'x'.repeat(250_000) };
  assert.equal(parsePublishRoomLayoutInput({ roomId: 'central-plaza', expectedVersion: 0, layout: oversized }, 'central-plaza'), null);
  const polluted = validLayout(); polluted.ui = JSON.parse('{"__proto__":{"owner":true}}');
  assert.equal(parsePublishRoomLayoutInput({ roomId: 'central-plaza', expectedVersion: 0, layout: polluted }, 'central-plaza'), null);
  assert.equal(parseResetRoomLayoutInput({ roomId: 'other-room', expectedVersion: 0 }, 'central-plaza'), null);
});

test('raw World session identifiers cannot enter published layouts', () => {
  const layout = validLayout(); layout.ui = { help: `secret session_${'ab'.repeat(64)}` };
  assert.equal(parsePublishRoomLayoutInput({ roomId: 'central-plaza', expectedVersion: 0, layout }, 'central-plaza'), null);
});

test('owner can grant editor and duplicate grants are deterministic and race-safe', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  const grants = await Promise.all(Array.from({ length: 8 }, () => repository.setRole(owner.id, editor.id, 'editor')));
  assert.deepEqual(new Set(grants.map((record) => record.role)), new Set(['editor']));
  assert.equal((await repository.listRoles()).filter((record) => record.userId === editor.id).length, 1);
});

test('editor and ordinary users cannot grant, revoke or self-promote', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  await repository.setRole(owner.id, editor.id, 'editor');
  await assert.rejects(() => repository.setRole(editor.id, ordinary.id, 'editor'), AdminInvariantError);
  await assert.rejects(() => repository.deleteRole(editor.id, owner.id), AdminInvariantError);
  await assert.rejects(() => repository.setRole(ordinary.id, ordinary.id, 'owner'), AdminInvariantError);
});

test('the final owner cannot be removed or demoted', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  await assert.rejects(() => repository.deleteRole(owner.id, owner.id), AdminInvariantError);
  await assert.rejects(() => repository.setRole(owner.id, owner.id, 'editor'), AdminInvariantError);
  await repository.ensureBootstrapOwner(secondOwner.id);
  await repository.setRole(owner.id, secondOwner.id, 'editor');
  assert.equal(await repository.getRole(secondOwner.id), 'editor');
});

test('optimistic publishing rejects stale and simultaneous overwrites', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  const first = await repository.publishRoomLayout(owner.id, { roomId: 'central-plaza', expectedVersion: 0, layout: validLayout() });
  assert.equal(first.version, 1);
  await assert.rejects(() => repository.publishRoomLayout(owner.id, { roomId: 'central-plaza', expectedVersion: 0, layout: validLayout() }), AdminVersionConflictError);
  const attempts = await Promise.allSettled([
    repository.publishRoomLayout(owner.id, { roomId: 'central-plaza', expectedVersion: 1, layout: validLayout() }),
    repository.publishRoomLayout(owner.id, { roomId: 'central-plaza', expectedVersion: 1, layout: validLayout() }),
  ]);
  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await repository.getRoomLayout('central-plaza')).version, 2);
  assert.equal(await repository.resetRoomLayout(owner.id, { roomId: 'central-plaza', expectedVersion: 2 }), 3);
  assert.deepEqual(await repository.getRoomLayout('central-plaza'), { roomId: 'central-plaza', version: 3, layout: null, updatedAt: (await repository.getRoomLayout('central-plaza')).updatedAt });
  assert.equal((await repository.publishRoomLayout(owner.id, { roomId: 'central-plaza', expectedVersion: 3, layout: validLayout() })).version, 4);
});

test('successful mutations create bounded audit records without raw payloads or secrets', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  await repository.setRole(owner.id, editor.id, 'editor');
  await repository.updateRoomMetadata(owner.id, validMetadata());
  await repository.publishRoomLayout(owner.id, { roomId: 'central-plaza', expectedVersion: 0, layout: validLayout() });
  const audit = await repository.getAuditRecords();
  assert.ok(audit.length >= 4);
  const serialized = JSON.stringify(audit);
  assert.doesNotMatch(serialized, /cookie|jwt|proof|secret|authorization|session_[0-9a-f]{128}/i);
  assert.equal(serialized.includes(JSON.stringify(validLayout())), false);
  assert.ok(audit.every((record) => record.actorUserId.startsWith('user_')));
});

async function withAdminServer(repository, callback) {
  const app = express();
  app.use('/api/admin', createAdminRouter({ appSessionConfig: config, repository }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await callback(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('admin HTTP session returns sanitized owner/editor capabilities and denies ordinary or unauthenticated users', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  await repository.setRole(owner.id, editor.id, 'editor');
  await withAdminServer(repository, async (baseUrl) => {
    const request = (user, headers = {}) => fetch(`${baseUrl}/api/admin/session`, { headers: { Cookie: cookieFor(user), Origin: origin, ...headers } });
    const ownerResponse = await request(owner);
    assert.equal(ownerResponse.status, 200);
    assert.deepEqual(await ownerResponse.json(), { role: 'owner', capabilities: ['admin:access', 'rooms:write', 'roles:manage'] });
    const editorResponse = await request(editor);
    assert.deepEqual(await editorResponse.json(), { role: 'editor', capabilities: ['admin:access', 'rooms:write'] });
    assert.equal((await request(ordinary, { 'X-Admin-Role': 'owner' })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/admin/session`, { headers: { Origin: origin } })).status, 401);
  });
});

test('role revocation takes effect on the next request using the same valid JWT', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  await repository.setRole(owner.id, editor.id, 'editor');
  const cookie = cookieFor(editor);
  await withAdminServer(repository, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/admin/session`, { headers: { Cookie: cookie, Origin: origin } })).status, 200);
    await repository.deleteRole(owner.id, editor.id);
    assert.equal((await fetch(`${baseUrl}/api/admin/session`, { headers: { Cookie: cookie, Origin: origin } })).status, 403);
  });
});

test('a JWT carrying a forged role claim cannot authenticate', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  const forged = signJwt({ username: owner.username, role: 'owner', iat: now }, sessionSecret, { algorithm: 'HS256', audience: 'human-world-web', expiresIn: 3600, issuer: 'human-world-server', jwtid: crypto.randomUUID(), subject: owner.id });
  const forgedCookie = serializeSessionCookie(forged, true).split(';')[0];
  assert.deepEqual(await authenticateAdminRequest({ appSessionConfig: config, repository, cookieHeader: forgedCookie, originHeader: origin, now }), { accepted: false, statusCode: 401 });
});

test('unauthorized publish and reset requests cannot mutate room state', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  await withAdminServer(repository, async (baseUrl) => {
    const headers = { 'Content-Type': 'application/json', Cookie: cookieFor(ordinary), Origin: origin };
    const publish = await fetch(`${baseUrl}/api/admin/rooms/central-plaza/layout`, { method: 'PUT', headers, body: JSON.stringify({ roomId: 'central-plaza', expectedVersion: 0, layout: validLayout() }) });
    const reset = await fetch(`${baseUrl}/api/admin/rooms/central-plaza/layout`, { method: 'DELETE', headers, body: JSON.stringify({ roomId: 'central-plaza', expectedVersion: 0 }) });
    assert.equal(publish.status, 403);
    assert.equal(reset.status, 403);
    assert.equal(await repository.getRoomLayout('central-plaza'), null);
  });
});

test('editor HTTP requests cannot manage roles and malformed role targets fail closed', async () => {
  const repository = new DevelopmentAdminRepository();
  await repository.ensureBootstrapOwner(owner.id);
  await repository.setRole(owner.id, editor.id, 'editor');
  await withAdminServer(repository, async (baseUrl) => {
    const editorHeaders = { 'Content-Type': 'application/json', Cookie: cookieFor(editor), Origin: origin };
    assert.equal((await fetch(`${baseUrl}/api/admin/roles/${ordinary.id}`, { method: 'PUT', headers: editorHeaders, body: JSON.stringify({ role: 'editor' }) })).status, 403);
    const ownerHeaders = { 'Content-Type': 'application/json', Cookie: cookieFor(owner), Origin: origin };
    assert.equal((await fetch(`${baseUrl}/api/admin/roles/not-a-user`, { method: 'PUT', headers: ownerHeaders, body: JSON.stringify({ role: 'editor' }) })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/admin/roles/${ordinary.id}`, { method: 'PUT', headers: ownerHeaders, body: JSON.stringify({ role: 'root' }) })).status, 400);
  });
});

test('migration forces RLS, revokes browser roles, protects final-owner and version invariants', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202608260001_security_phase5_admin_rbac.sql', import.meta.url), 'utf8');
  for (const table of ['admin_roles', 'published_room_layouts', 'admin_audit_log']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
  }
  assert.match(sql, /revoke all[\s\S]*from anon, authenticated/i);
  assert.match(sql, /last_owner/i);
  assert.match(sql, /version_conflict/i);
  assert.match(sql, /prevent_admin_audit_mutation/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to (anon|authenticated)/i);
});

test('production frontend has no legacy flag authority and lazy-loads the admin panel behind capabilities', async () => {
  const roomSource = await readFile(new URL('../src/components/world/Room.tsx', import.meta.url), 'utf8');
  const serviceSource = await readFile(new URL('../src/services/AdminService.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(roomSource + serviceSource, /VITE_ENABLE_ADMIN_PANEL/);
  assert.match(roomSource, /lazy\(\(\) => import\('\.\.\/admin\/AdminControlPanel'\)/);
  assert.match(roomSource, /adminSession\?\.capabilities\.includes\('rooms:write'\)/);
  assert.match(roomSource, /if \(!adminEnabled\) return/);
  assert.doesNotMatch(roomSource, /import\.meta\.env\.DEV\s*\|\|/);
});
