import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { deriveInternalUser, serializeSessionCookie, signApplicationSession } from './appSession.js';
import {
  authenticatePersistenceRequest,
  createPersistenceConfig,
  issuePersistedApplicationSession,
  parseAvatarAppearance,
  parseCreatePostInput,
  parseCreateRoomInput,
  persistVerifiedIdentity,
} from './persistence.js';
import { createPersistenceRouter } from './persistenceRoutes.js';
import { DevelopmentMemoryPersistenceRepository } from './supabasePersistence.js';

const sessionSecret = 'session-secret-7Px!mQ2#vN8$kR4@tY6&wB9';
const identitySecret = 'identity-secret-3Fd!zK8#pW5$gT9@rM2&xC7';
const origin = 'https://world.example';
const now = Math.floor(Date.now() / 1000);
const user = deriveInternalUser(`session_${'c3'.repeat(64)}`, identitySecret);
const otherUser = deriveInternalUser(`session_${'d4'.repeat(64)}`, identitySecret);
const appSessionConfig = { appOrigin: origin, identitySecret, isProduction: true, sessionSecret };
const token = signApplicationSession(user, sessionSecret, { now, jti: '123e4567-e89b-42d3-a456-426614174002' });
const cookie = serializeSessionCookie(token, true).split(';')[0];

test('production persistence configuration fails closed when either server credential is absent', () => {
  assert.equal(createPersistenceConfig({ NODE_ENV: 'production' }), null);
  assert.equal(createPersistenceConfig({ NODE_ENV: 'production', SUPABASE_URL: 'https://project.supabase.co' }), null);
  assert.equal(createPersistenceConfig({ NODE_ENV: 'production', SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(64) }), null);
});

test('only an explicit development flag enables memory persistence', () => {
  assert.equal(createPersistenceConfig({ NODE_ENV: 'development' }), null);
  assert.equal(createPersistenceConfig({ NODE_ENV: 'production', ENABLE_DEV_MOCK_PERSISTENCE: 'true' }), null);
  assert.deepEqual(createPersistenceConfig({ NODE_ENV: 'development', ENABLE_DEV_MOCK_PERSISTENCE: 'true' }), { mode: 'development-mock' });
});

test('accepts valid server-only Supabase configuration and ignores VITE credentials', () => {
  assert.deepEqual(createPersistenceConfig({ NODE_ENV: 'production', SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role-7Px!mQ2#vN8$kR4@tY6&wB9-extra' }), { mode: 'supabase', supabaseUrl: 'https://project.supabase.co', serviceRoleKey: 'service-role-7Px!mQ2#vN8$kR4@tY6&wB9-extra' });
  assert.equal(createPersistenceConfig({ NODE_ENV: 'production', VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(64) }), null);
});

test('persistence authentication requires exact Origin and the Phase 2 cookie', () => {
  assert.deepEqual(authenticatePersistenceRequest({ config: appSessionConfig, cookieHeader: cookie, originHeader: origin, now }), { accepted: true, user });
  assert.deepEqual(authenticatePersistenceRequest({ config: appSessionConfig, cookieHeader: cookie, originHeader: undefined, now }), { accepted: false, statusCode: 403 });
  assert.deepEqual(authenticatePersistenceRequest({ config: appSessionConfig, cookieHeader: cookie, originHeader: 'https://evil.example', now }), { accepted: false, statusCode: 403 });
  assert.deepEqual(authenticatePersistenceRequest({ config: appSessionConfig, cookieHeader: undefined, originHeader: origin, now }), { accepted: false, statusCode: 401 });
  assert.deepEqual(authenticatePersistenceRequest({ config: appSessionConfig, cookieHeader: `${cookie}; ${cookie}`, originHeader: origin, now }), { accepted: false, statusCode: 401 });
  assert.deepEqual(authenticatePersistenceRequest({ config: appSessionConfig, cookieHeader: `${cookie.slice(0, -1)}x`, originHeader: origin, now }), { accepted: false, statusCode: 401 });
});

test('post, room and avatar schemas reject client-controlled identity and extra fields', () => {
  assert.equal(parseCreatePostInput({ content: 'hello', roomId: null, authorId: otherUser.id }), null);
  assert.equal(parseCreatePostInput({ content: 'hello', roomId: null, authorName: otherUser.username }), null);
  assert.equal(parseCreateRoomInput({ name: 'My Room', type: 'lounge', ownerId: otherUser.id }), null);
  assert.equal(parseAvatarAppearance({ baseColor: 1, hairColor: 2, outfitColor: 3, accessoryColor: 4, hair: 'wave', userId: otherUser.id }), null);
});

test('strict content, room and avatar validation rejects malformed values', () => {
  assert.equal(parseCreatePostInput({ content: '', roomId: null }), null);
  assert.equal(parseCreatePostInput({ content: 'x'.repeat(2001), roomId: null }), null);
  assert.equal(parseCreatePostInput({ content: 'ok', roomId: '../admin' }), null);
  assert.equal(parseCreateRoomInput({ name: ' Room ', type: 'lounge' }), null);
  assert.equal(parseCreateRoomInput({ name: 'Room', type: 'Admin Role' }), null);
  assert.equal(parseAvatarAppearance({ baseColor: -1, hairColor: 2, outfitColor: 3, accessoryColor: 4, hair: 'wave' }), null);
  assert.equal(parseAvatarAppearance({ baseColor: 1, hairColor: 2, outfitColor: 3, accessoryColor: 4, hair: 'unknown' }), null);
});

test('verified identity must persist successfully before session issuance can continue', async () => {
  const repository = new DevelopmentMemoryPersistenceRepository();
  assert.equal((await persistVerifiedIdentity(repository, user)).id, user.id);
  const failingRepository = { ...repository, upsertVerifiedProfile: async () => { throw new Error('database down'); } };
  let issuedToken = null;
  await assert.rejects(async () => { issuedToken = await issuePersistedApplicationSession(failingRepository, user, sessionSecret); });
  assert.equal(issuedToken, null);
});

test('repository stores only derived application identity, never the World session identifier', async () => {
  const repository = new DevelopmentMemoryPersistenceRepository();
  const worldSessionId = `session_${'e5'.repeat(64)}`;
  const derived = deriveInternalUser(worldSessionId, identitySecret);
  await repository.upsertVerifiedProfile(derived);
  assert.equal(JSON.stringify([...repository.profiles.values()]).includes(worldSessionId), false);
});

test('post authors and room owners are bound to the authenticated user', async () => {
  const repository = new DevelopmentMemoryPersistenceRepository();
  await repository.upsertVerifiedProfile(user);
  const post = await repository.createPost(user, { content: 'Authenticated post', roomId: null });
  const room = await repository.createRoom(user, { name: 'Secure Lounge', type: 'lounge' });
  assert.equal(post.author_id, user.id);
  assert.equal(post.author_name, user.username);
  assert.equal(room.owner_id, user.id);
});

test('self-follow fails and duplicate follow is race-safe', async () => {
  const repository = new DevelopmentMemoryPersistenceRepository();
  await repository.upsertVerifiedProfile(user);
  await repository.upsertVerifiedProfile(otherUser);
  await assert.rejects(() => repository.setFollowing(user.id, user.id, true));
  await Promise.all(Array.from({ length: 8 }, () => repository.setFollowing(user.id, otherUser.id, true)));
  assert.deepEqual(await repository.getProfileCounts(otherUser.id), { followers: 1, following: 0 });
});

test('duplicate likes are idempotent and count from persisted unique records', async () => {
  const repository = new DevelopmentMemoryPersistenceRepository();
  await repository.upsertVerifiedProfile(user);
  const post = await repository.createPost(user, { content: 'Like once', roomId: null });
  const counts = await Promise.all(Array.from({ length: 8 }, () => repository.likePost(user.id, post.id)));
  assert.deepEqual(new Set(counts), new Set([1]));
});

test('avatar reads and writes are scoped to the acting application user', async () => {
  const repository = new DevelopmentMemoryPersistenceRepository();
  const appearance = { baseColor: 1, hairColor: 2, outfitColor: 3, accessoryColor: 4, hair: 'buzz' };
  await repository.updateAvatar(user.id, appearance);
  assert.deepEqual(await repository.getAvatar(user.id), appearance);
  assert.equal(await repository.getAvatar(otherUser.id), null);
});

async function withPersistenceServer(callback) {
  const repository = new DevelopmentMemoryPersistenceRepository();
  await repository.upsertVerifiedProfile(user);
  const app = express();
  app.use('/api/persistence', createPersistenceRouter({ appSessionConfig, repository }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await callback(`http://127.0.0.1:${address.port}`, repository); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('HTTP persistence routes authenticate and emit no-store responses', async () => {
  await withPersistenceServer(async (baseUrl, repository) => {
    const preflight = await fetch(`${baseUrl}/api/persistence/posts`, { method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    const accepted = await fetch(`${baseUrl}/api/persistence/feed`, { headers: { Cookie: cookie, Origin: origin } });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(`${baseUrl}/api/persistence/feed`, { headers: { Origin: origin } })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/persistence/feed`, { headers: { Cookie: cookie, Origin: 'https://evil.example' } })).status, 403);
    repository.getFeed = async () => { throw new Error('private database detail'); };
    const failed = await fetch(`${baseUrl}/api/persistence/feed`, { headers: { Cookie: cookie, Origin: origin } });
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'Persistence service unavailable' });
  });
});

test('HTTP routes reject forged identity and bind a valid post to the session user', async () => {
  await withPersistenceServer(async (baseUrl) => {
    const headers = { 'Content-Type': 'application/json', Cookie: cookie, Origin: origin };
    const forged = await fetch(`${baseUrl}/api/persistence/posts`, { method: 'POST', headers, body: JSON.stringify({ content: 'forged', roomId: null, authorId: otherUser.id }) });
    assert.equal(forged.status, 400);
    const accepted = await fetch(`${baseUrl}/api/persistence/posts`, { method: 'POST', headers, body: JSON.stringify({ content: 'trusted', roomId: null }) });
    assert.equal(accepted.status, 201);
    const post = (await accepted.json()).post;
    assert.equal(post.author_id, user.id);
    assert.equal(post.author_name, user.username);
  });
});

test('migration enables RLS and enforces identity, uniqueness and ownership constraints', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202608250001_security_phase4_persistence.sql', import.meta.url), 'utf8');
  for (const table of ['profiles', 'rooms', 'avatar_appearances', 'follows', 'posts', 'post_likes']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
  }
  assert.match(sql, /\^user_\[0-9a-f\]\{64\}\$/);
  assert.match(sql, /primary key \(follower_id, following_id\)/i);
  assert.match(sql, /primary key \(post_id, user_id\)/i);
  assert.match(sql, /follower_id <> following_id/i);
  assert.match(sql, /revoke all[\s\S]*from anon, authenticated/i);
});

test('client source contains no Supabase service credential path or direct client', async () => {
  const files = ['../src/services/ProfileService.ts', '../src/services/FeedService.ts', '../src/services/RoomService.ts', '../src/services/AvatarService.ts'];
  const source = (await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), 'utf8')))).join('\n');
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|createClient\(|\.from\(['"]/);
});
