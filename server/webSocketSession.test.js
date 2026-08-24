import assert from 'node:assert/strict';
import test from 'node:test';
import jsonwebtoken from 'jsonwebtoken';

import {
  APP_SESSION_AUDIENCE,
  APP_SESSION_ISSUER,
  APP_SESSION_LIFETIME_SECONDS,
  deriveInternalUser,
  serializeSessionCookie,
  signApplicationSession,
} from './appSession.js';
import {
  AuthenticatedMultiplayerState,
  MAX_CHAT_LENGTH,
  MAX_MOVEMENT_COORDINATE,
  attachWebSocketAuthentication,
  authenticateWebSocketUpgrade,
  getWebSocketAuthentication,
  parseClientWebSocketMessage,
} from './webSocketSession.js';

const { sign: signJwt } = jsonwebtoken;
const sessionSecret = 'session-secret-7Px!mQ2#vN8$kR4@tY6&wB9';
const identitySecret = 'identity-secret-3Fd!zK8#pW5$gT9@rM2&xC7';
const worldSessionId = `session_${'b2'.repeat(64)}`;
const user = deriveInternalUser(worldSessionId, identitySecret);
const now = 1_900_000_000;
const jti = '123e4567-e89b-42d3-a456-426614174001';
const config = {
  appOrigin: 'https://world.example',
  identitySecret,
  isProduction: true,
  sessionSecret,
};

function cookieHeader(token) {
  return serializeSessionCookie(token, true).split(';')[0];
}

function validToken() {
  return signApplicationSession(user, sessionSecret, { now, jti });
}

function authenticate(overrides = {}) {
  return authenticateWebSocketUpgrade({
    config,
    cookieHeader: cookieHeader(validToken()),
    originHeader: config.appOrigin,
    protocolHeader: undefined,
    requestTarget: '/',
    now,
    ...overrides,
  });
}

function customToken({ algorithm = 'HS256', audience = APP_SESSION_AUDIENCE, issuer = APP_SESSION_ISSUER } = {}) {
  return signJwt(
    { username: user.username, iat: now },
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

test('accepts an exact Origin with a valid session cookie', () => {
  const result = authenticate();
  assert.equal(result.accepted, true);
  assert.deepEqual(result.authentication.user, user);
});

test('rejects a missing Origin', () => {
  assert.deepEqual(authenticate({ originHeader: undefined }), { accepted: false, statusCode: 403 });
});

test('rejects an unexpected or malformed Origin', () => {
  assert.deepEqual(authenticate({ originHeader: 'https://evil.example' }), { accepted: false, statusCode: 403 });
  assert.deepEqual(authenticate({ originHeader: [config.appOrigin] }), { accepted: false, statusCode: 403 });
});

test('rejects a missing or duplicate session cookie', () => {
  assert.deepEqual(authenticate({ cookieHeader: undefined }), { accepted: false, statusCode: 401 });
  const cookie = cookieHeader(validToken());
  assert.deepEqual(authenticate({ cookieHeader: `${cookie}; ${cookie}` }), { accepted: false, statusCode: 401 });
});

test('rejects a malformed or tampered token', () => {
  assert.deepEqual(authenticate({ cookieHeader: '__Host-human_world_session=not-a-jwt' }), { accepted: false, statusCode: 401 });
  const token = validToken();
  const [header, payload, signature] = token.split('.');
  const tampered = `${header}.${payload}.${signature.startsWith('a') ? 'b' : 'a'}${signature.slice(1)}`;
  assert.deepEqual(authenticate({ cookieHeader: cookieHeader(tampered) }), { accepted: false, statusCode: 401 });
});

test('rejects an expired token', () => {
  const expired = signApplicationSession(user, sessionSecret, {
    now: now - APP_SESSION_LIFETIME_SECONDS - 1,
    jti,
  });
  assert.deepEqual(authenticate({ cookieHeader: cookieHeader(expired) }), { accepted: false, statusCode: 401 });
});

test('rejects tokens with the wrong issuer, audience, or algorithm', () => {
  assert.deepEqual(authenticate({ cookieHeader: cookieHeader(customToken({ issuer: 'other-issuer' })) }), { accepted: false, statusCode: 401 });
  assert.deepEqual(authenticate({ cookieHeader: cookieHeader(customToken({ audience: 'other-audience' })) }), { accepted: false, statusCode: 401 });
  assert.deepEqual(authenticate({ cookieHeader: cookieHeader(customToken({ algorithm: 'HS384' })) }), { accepted: false, statusCode: 401 });
});

test('query-string, path, protocol, and message-body tokens cannot authenticate', () => {
  assert.deepEqual(authenticate({ requestTarget: `/?token=${validToken()}` }), { accepted: false, statusCode: 400 });
  assert.deepEqual(authenticate({ requestTarget: `/${validToken()}` }), { accepted: false, statusCode: 400 });
  assert.deepEqual(authenticate({ protocolHeader: validToken() }), { accepted: false, statusCode: 400 });
  assert.equal(parseClientWebSocketMessage({ type: 'join', roomId: 'central-plaza', token: validToken() }), null);
});

test('attaches an immutable authenticated identity to the socket', () => {
  const result = authenticate();
  assert.equal(result.accepted, true);
  const socket = attachWebSocketAuthentication({}, result.authentication);
  const authentication = getWebSocketAuthentication(socket);
  assert.deepEqual(authentication.user, user);
  assert.equal(Object.isFrozen(authentication), true);
  assert.equal(Object.isFrozen(authentication.user), true);
  assert.throws(() => { authentication.user.username = 'Forged'; }, TypeError);
});

test('forged join identity fields are rejected and cannot alter server identity', () => {
  assert.equal(parseClientWebSocketMessage({ type: 'join', roomId: 'central-plaza', name: 'Admin' }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'join', roomId: 'central-plaza', userId: 'user_forged' }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'join', roomId: 'central-plaza', id: 'user_forged' }), null);

  const state = new AuthenticatedMultiplayerState(() => 'connection-1');
  const connection = state.register({}, { user }).connection;
  const joined = state.join(connection, 'central-plaza', 0, 0);
  assert.equal(joined.presence.id, user.id);
  assert.equal(joined.presence.name, user.username);
});

test('malformed join, move, chat, and unsupported payloads fail closed', () => {
  assert.equal(parseClientWebSocketMessage(null), null);
  assert.equal(parseClientWebSocketMessage([]), null);
  assert.equal(parseClientWebSocketMessage({ type: 'unknown' }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'join', roomId: 'INVALID_ROOM' }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'join', roomId: `a${'b'.repeat(64)}` }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'move', x: '1', y: 2 }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'chat', text: 42 }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'chat', text: 'hello', username: 'Forged' }), null);
});

test('rejects NaN, Infinity, and excessive movement coordinates', () => {
  assert.equal(parseClientWebSocketMessage({ type: 'move', x: Number.NaN, y: 0 }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'move', x: Number.POSITIVE_INFINITY, y: 0 }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'move', x: MAX_MOVEMENT_COORDINATE + 1, y: 0 }), null);
  assert.deepEqual(parseClientWebSocketMessage({ type: 'move', x: MAX_MOVEMENT_COORDINATE, y: -MAX_MOVEMENT_COORDINATE }), {
    type: 'move',
    x: MAX_MOVEMENT_COORDINATE,
    y: -MAX_MOVEMENT_COORDINATE,
  });
});

test('rejects empty and oversized chat while accepting bounded text', () => {
  assert.equal(parseClientWebSocketMessage({ type: 'chat', text: '   ' }), null);
  assert.equal(parseClientWebSocketMessage({ type: 'chat', text: 'x'.repeat(MAX_CHAT_LENGTH + 1) }), null);
  assert.deepEqual(parseClientWebSocketMessage({ type: 'chat', text: '  hello world  ' }), {
    type: 'chat',
    text: 'hello world',
  });
});

test('duplicate connections safely replace the old presence', () => {
  let nextConnection = 0;
  const state = new AuthenticatedMultiplayerState(() => `connection-${++nextConnection}`);
  const first = state.register({ socket: 1 }, { user }).connection;
  state.join(first, 'central-plaza', 1, 1);

  const replacement = state.register({ socket: 2 }, { user });
  assert.equal(replacement.replaced, first);
  assert.equal(replacement.departedRoomId, 'central-plaza');
  assert.deepEqual(state.getRoomState('central-plaza'), []);
  assert.equal(state.isCurrent(first), false);
  assert.equal(state.isCurrent(replacement.connection), true);
});

test('an old disconnect cannot remove the replacement connection', () => {
  let nextConnection = 0;
  const state = new AuthenticatedMultiplayerState(() => `connection-${++nextConnection}`);
  const first = state.register({ socket: 1 }, { user }).connection;
  state.join(first, 'central-plaza', 1, 1);
  const second = state.register({ socket: 2 }, { user }).connection;
  state.join(second, 'central-plaza', 2, 2);

  assert.deepEqual(state.disconnect(first), { departedRoomId: null, removedActiveConnection: false });
  assert.deepEqual(state.getRoomState('central-plaza'), [{ id: user.id, name: user.username, x: 2, y: 2 }]);
  assert.equal(state.isCurrent(second), true);
});

test('disconnect removes only the matching authenticated connection', () => {
  const otherWorldSessionId = `session_${'c3'.repeat(64)}`;
  const otherUser = deriveInternalUser(otherWorldSessionId, identitySecret);
  let nextConnection = 0;
  const state = new AuthenticatedMultiplayerState(() => `connection-${++nextConnection}`);
  const first = state.register({ socket: 1 }, { user }).connection;
  const second = state.register({ socket: 2 }, { user: otherUser }).connection;
  state.join(first, 'central-plaza', 1, 1);
  state.join(second, 'central-plaza', 2, 2);

  assert.deepEqual(state.disconnect(first), { departedRoomId: 'central-plaza', removedActiveConnection: true });
  assert.deepEqual(state.getRoomState('central-plaza'), [{ id: otherUser.id, name: otherUser.username, x: 2, y: 2 }]);
});

test('raw World session identifiers never reach socket authentication or room messages', () => {
  const result = authenticate();
  assert.equal(result.accepted, true);
  const state = new AuthenticatedMultiplayerState(() => 'connection-1');
  const connection = state.register({}, result.authentication).connection;
  const joined = state.join(connection, 'central-plaza', 0, 0);
  assert.equal(JSON.stringify(result.authentication).includes(worldSessionId), false);
  assert.equal(JSON.stringify(joined).includes(worldSessionId), false);
});
