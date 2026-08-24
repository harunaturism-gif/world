import assert from 'node:assert/strict';
import test from 'node:test';
import jsonwebtoken from 'jsonwebtoken';

const { decode, sign: signJwt } = jsonwebtoken;

import {
  APP_SESSION_AUDIENCE,
  APP_SESSION_ISSUER,
  APP_SESSION_LIFETIME_SECONDS,
  DEVELOPMENT_SESSION_COOKIE,
  PRODUCTION_SESSION_COOKIE,
  createAppSessionConfig,
  createSanitizedAuthResponse,
  deriveInternalUser,
  extractSessionToken,
  isExpectedBrowserOrigin,
  isValidApplicationSecret,
  serializeLogoutCookie,
  serializeSessionCookie,
  signApplicationSession,
  verifyApplicationSession,
} from './appSession.js';

const sessionSecret = 'session-secret-7Px!mQ2#vN8$kR4@tY6&wB9';
const identitySecret = 'identity-secret-3Fd!zK8#pW5$gT9@rM2&xC7';
const otherIdentitySecret = 'different-identity-8Qs!nL4#yH7$vA2@cR5';
const worldSessionId = `session_${'a1'.repeat(64)}`;
const now = 1_800_000_000;
const jti = '123e4567-e89b-42d3-a456-426614174000';
const user = deriveInternalUser(worldSessionId, identitySecret);

function signCustomToken({ algorithm = 'HS256', audience = APP_SESSION_AUDIENCE, issuer = APP_SESSION_ISSUER, payload = {} } = {}) {
  return signJwt(
    { username: user.username, iat: now, ...payload },
    sessionSecret,
    {
      algorithm,
      audience,
      expiresIn: APP_SESSION_LIFETIME_SECONDS,
      issuer,
      jwtid: jti,
      subject: user.id,
    },
  );
}

test('validates meaningful application secrets of at least 32 bytes', () => {
  assert.equal(isValidApplicationSecret(sessionSecret), true);
  assert.equal(isValidApplicationSecret('short-secret'), false);
  assert.equal(isValidApplicationSecret('a'.repeat(64)), false);
  assert.equal(isValidApplicationSecret(` ${sessionSecret}`), false);
});

test('production configuration fails closed for missing, shared, or invalid values', () => {
  assert.equal(createAppSessionConfig({ NODE_ENV: 'production' }), null);
  assert.equal(createAppSessionConfig({
    APP_SESSION_SECRET: sessionSecret,
    APP_IDENTITY_SECRET: sessionSecret,
    APP_ORIGIN: 'https://world.example',
    NODE_ENV: 'production',
  }), null);
  assert.equal(createAppSessionConfig({
    APP_SESSION_SECRET: sessionSecret,
    APP_IDENTITY_SECRET: identitySecret,
    APP_ORIGIN: 'https://world.example/path',
    NODE_ENV: 'production',
  }), null);
  assert.equal(createAppSessionConfig({
    APP_SESSION_SECRET: sessionSecret,
    APP_IDENTITY_SECRET: identitySecret,
    APP_ORIGIN: 'http://world.example',
    NODE_ENV: 'production',
  }), null);
  assert.deepEqual(createAppSessionConfig({
    APP_SESSION_SECRET: sessionSecret,
    APP_IDENTITY_SECRET: identitySecret,
    APP_ORIGIN: 'https://world.example',
    NODE_ENV: 'production',
  }), {
    appOrigin: 'https://world.example',
    identitySecret,
    isProduction: true,
    sessionSecret,
  });
  assert.deepEqual(createAppSessionConfig({
    APP_SESSION_SECRET: sessionSecret,
    APP_IDENTITY_SECRET: identitySecret,
    APP_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'development',
  }), {
    appOrigin: 'http://localhost:5173',
    identitySecret,
    isProduction: false,
    sessionSecret,
  });
});

test('derives a deterministic internal user ID', () => {
  assert.deepEqual(deriveInternalUser(worldSessionId, identitySecret), user);
  assert.match(user.id, /^user_[0-9a-f]{64}$/);
  assert.match(user.username, /^Human_[0-9A-F]{8}$/);
});

test('different identity secrets produce different internal IDs', () => {
  assert.notEqual(deriveInternalUser(worldSessionId, otherIdentitySecret).id, user.id);
});

test('derived identity does not reveal the World session ID', () => {
  assert.equal(user.id.includes(worldSessionId), false);
  assert.equal(user.username.includes(worldSessionId), false);
});

test('signs and verifies a valid minimal HS256 application token', () => {
  const token = signApplicationSession(user, sessionSecret, { now, jti });
  assert.deepEqual(verifyApplicationSession(token, sessionSecret, now), user);

  const payload = decode(token);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.iss, APP_SESSION_ISSUER);
  assert.equal(payload.aud, APP_SESSION_AUDIENCE);
  assert.equal(payload.iat, now);
  assert.equal(payload.exp, now + APP_SESSION_LIFETIME_SECONDS);
  assert.equal(payload.jti, jti);
  assert.equal(Object.hasOwn(payload, 'role'), false);
  assert.equal(JSON.stringify(payload).includes(worldSessionId), false);
});

test('rejects a tampered token', () => {
  const token = signApplicationSession(user, sessionSecret, { now, jti });
  const [header, payload, signature] = token.split('.');
  const replacement = signature.startsWith('a') ? 'b' : 'a';
  const tampered = `${header}.${payload}.${replacement}${signature.slice(1)}`;
  assert.equal(verifyApplicationSession(tampered, sessionSecret, now), null);
});

test('rejects an expired token', () => {
  const token = signApplicationSession(user, sessionSecret, { now, jti });
  assert.equal(verifyApplicationSession(token, sessionSecret, now + APP_SESSION_LIFETIME_SECONDS + 1), null);
});

test('rejects the wrong issuer', () => {
  assert.equal(verifyApplicationSession(signCustomToken({ issuer: 'other-issuer' }), sessionSecret, now), null);
});

test('rejects the wrong audience', () => {
  assert.equal(verifyApplicationSession(signCustomToken({ audience: 'other-audience' }), sessionSecret, now), null);
});

test('rejects the wrong signing algorithm', () => {
  assert.equal(verifyApplicationSession(signCustomToken({ algorithm: 'HS384' }), sessionSecret, now), null);
});

test('rejects a malformed or expanded token payload', () => {
  const token = signCustomToken({ payload: { role: 'admin' } });
  assert.equal(verifyApplicationSession(token, sessionSecret, now), null);
});

test('production cookie uses __Host security attributes without persistence or Domain', () => {
  const token = signApplicationSession(user, sessionSecret, { now, jti });
  const cookie = serializeSessionCookie(token, true);
  assert.equal(cookie.startsWith(`${PRODUCTION_SESSION_COOKIE}=`), true);
  assert.match(cookie, /; Path=\//);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.doesNotMatch(cookie, /Domain=/i);
  assert.doesNotMatch(cookie, /Expires=|Max-Age=/i);
});

test('development cookie uses a separate non-Host name without Secure', () => {
  const token = signApplicationSession(user, sessionSecret, { now, jti });
  const cookie = serializeSessionCookie(token, false);
  assert.equal(cookie.startsWith(`${DEVELOPMENT_SESSION_COOKIE}=`), true);
  assert.equal(cookie.startsWith('__Host-'), false);
  assert.doesNotMatch(cookie, /; Secure/);
});

test('logout clears the exact production cookie with matching security attributes', () => {
  const cookie = serializeLogoutCookie(true);
  assert.equal(cookie.startsWith(`${PRODUCTION_SESSION_COOKIE}=;`), true);
  assert.match(cookie, /; Path=\//);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.match(cookie, /; Max-Age=0/);
  assert.doesNotMatch(cookie, /Domain=/i);
});

test('extracts only the exact cookie name and rejects ambiguous duplicates', () => {
  const token = signApplicationSession(user, sessionSecret, { now, jti });
  assert.equal(extractSessionToken(`${PRODUCTION_SESSION_COOKIE}_copy=${token}`, true), null);
  assert.equal(extractSessionToken(`other=1; ${PRODUCTION_SESSION_COOKIE}=${token}`, true), token);
  assert.equal(extractSessionToken(`${PRODUCTION_SESSION_COOKIE}=${token}; ${PRODUCTION_SESSION_COOKIE}=${token}`, true), null);
});

test('sanitized authentication response contains no World session ID', () => {
  const response = createSanitizedAuthResponse(user);
  assert.deepEqual(response, { verified: true, user });
  assert.equal(JSON.stringify(response).includes(worldSessionId), false);
  assert.equal(Object.hasOwn(response, 'worldIdentity'), false);
});

test('rejects an unexpected browser Origin', () => {
  assert.equal(isExpectedBrowserOrigin('https://evil.example', 'https://world.example'), false);
  assert.equal(isExpectedBrowserOrigin('https://world.example', 'https://world.example'), true);
  assert.equal(isExpectedBrowserOrigin(undefined, 'https://world.example'), true);
});
