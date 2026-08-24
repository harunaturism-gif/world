import { createHmac, randomUUID } from 'node:crypto';
import jsonwebtoken from 'jsonwebtoken';

const { sign, verify } = jsonwebtoken;

export const APP_SESSION_ISSUER = 'human-world-server';
export const APP_SESSION_AUDIENCE = 'human-world-web';
export const APP_SESSION_LIFETIME_SECONDS = 12 * 60 * 60;
export const PRODUCTION_SESSION_COOKIE = '__Host-human_world_session';
export const DEVELOPMENT_SESSION_COOKIE = 'human_world_session_dev';

const WORLD_SESSION_ID_PATTERN = /^session_[0-9a-fA-F]{128}$/;
const INTERNAL_USER_ID_PATTERN = /^user_[0-9a-f]{64}$/;
const USERNAME_PATTERN = /^Human_[0-9A-F]{8}$/;
const JWT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const EXPECTED_PAYLOAD_KEYS = ['aud', 'exp', 'iat', 'iss', 'jti', 'sub', 'username'];

export interface InternalUser {
  id: string;
  username: string;
}

export interface AppSessionConfig {
  appOrigin: string;
  identitySecret: string;
  isProduction: boolean;
  sessionSecret: string;
}

interface TokenOptions {
  jti?: string;
  lifetimeSeconds?: number;
  now?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function usernameForUserId(userId: string) {
  return `Human_${userId.slice(-8).toUpperCase()}`;
}

function isInternalUser(value: unknown): value is InternalUser {
  if (!isRecord(value) || Object.keys(value).length !== 2) return false;
  return typeof value.id === 'string'
    && INTERNAL_USER_ID_PATTERN.test(value.id)
    && typeof value.username === 'string'
    && USERNAME_PATTERN.test(value.username)
    && value.username === usernameForUserId(value.id);
}

export function isValidApplicationSecret(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim()) return false;
  const secretBytes = Buffer.from(value, 'utf8');
  return secretBytes.length >= 32 && new Set(secretBytes).size >= 8;
}

export function isValidAppOrigin(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim()) return false;

  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && value === parsed.origin;
  } catch {
    return false;
  }
}

export function createAppSessionConfig(
  environment: Record<string, string | undefined>,
): AppSessionConfig | null {
  const sessionSecret = environment.APP_SESSION_SECRET;
  const identitySecret = environment.APP_IDENTITY_SECRET;
  const appOrigin = environment.APP_ORIGIN;
  const isProduction = environment.NODE_ENV !== 'development';

  if (!isValidApplicationSecret(sessionSecret)
    || !isValidApplicationSecret(identitySecret)
    || sessionSecret === identitySecret
    || !isValidAppOrigin(appOrigin)
    || (isProduction && !appOrigin.startsWith('https://'))) {
    return null;
  }

  return {
    appOrigin,
    identitySecret,
    isProduction,
    sessionSecret,
  };
}

export function deriveInternalUser(worldSessionId: string, identitySecret: string): InternalUser {
  if (!WORLD_SESSION_ID_PATTERN.test(worldSessionId) || !isValidApplicationSecret(identitySecret)) {
    throw new Error('Invalid identity derivation input');
  }

  const digest = createHmac('sha256', identitySecret)
    .update(worldSessionId, 'utf8')
    .digest('hex');
  const id = `user_${digest}`;

  return { id, username: usernameForUserId(id) };
}

export function signApplicationSession(
  user: InternalUser,
  sessionSecret: string,
  options: TokenOptions = {},
): string {
  if (!isInternalUser(user) || !isValidApplicationSecret(sessionSecret)) {
    throw new Error('Invalid application session input');
  }

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const lifetimeSeconds = options.lifetimeSeconds ?? APP_SESSION_LIFETIME_SECONDS;
  const jti = options.jti ?? randomUUID();

  if (!Number.isInteger(now)
    || !Number.isInteger(lifetimeSeconds)
    || lifetimeSeconds <= 0
    || lifetimeSeconds > APP_SESSION_LIFETIME_SECONDS
    || !JWT_ID_PATTERN.test(jti)) {
    throw new Error('Invalid application session metadata');
  }

  return sign(
    { username: user.username, iat: now },
    sessionSecret,
    {
      algorithm: 'HS256',
      audience: APP_SESSION_AUDIENCE,
      expiresIn: lifetimeSeconds,
      issuer: APP_SESSION_ISSUER,
      jwtid: jti,
      subject: user.id,
    },
  );
}

export function verifyApplicationSession(
  token: string,
  sessionSecret: string,
  now = Math.floor(Date.now() / 1000),
): InternalUser | null {
  if (!JWT_PATTERN.test(token) || !isValidApplicationSecret(sessionSecret) || !Number.isInteger(now)) {
    return null;
  }

  try {
    const payload = verify(token, sessionSecret, {
      algorithms: ['HS256'],
      audience: APP_SESSION_AUDIENCE,
      clockTimestamp: now,
      issuer: APP_SESSION_ISSUER,
    });

    if (!isRecord(payload)) return null;
    if (Object.keys(payload).sort().join(',') !== EXPECTED_PAYLOAD_KEYS.join(',')) return null;
    if (payload.iss !== APP_SESSION_ISSUER || payload.aud !== APP_SESSION_AUDIENCE) return null;
    if (typeof payload.sub !== 'string' || !INTERNAL_USER_ID_PATTERN.test(payload.sub)) return null;
    if (typeof payload.username !== 'string' || payload.username !== usernameForUserId(payload.sub)) return null;
    if (typeof payload.jti !== 'string' || !JWT_ID_PATTERN.test(payload.jti)) return null;
    if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
    if ((payload.exp as number) <= (payload.iat as number)
      || (payload.exp as number) - (payload.iat as number) > APP_SESSION_LIFETIME_SECONDS
      || (payload.iat as number) > now + 60) {
      return null;
    }

    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export function getSessionCookieName(isProduction: boolean) {
  return isProduction ? PRODUCTION_SESSION_COOKIE : DEVELOPMENT_SESSION_COOKIE;
}

function cookieAttributes(isProduction: boolean) {
  return [
    'Path=/',
    'HttpOnly',
    ...(isProduction ? ['Secure'] : []),
    'SameSite=Lax',
  ];
}

export function serializeSessionCookie(token: string, isProduction: boolean): string {
  if (!JWT_PATTERN.test(token)) throw new Error('Invalid application session token');
  return `${getSessionCookieName(isProduction)}=${token}; ${cookieAttributes(isProduction).join('; ')}`;
}

export function serializeLogoutCookie(isProduction: boolean): string {
  return `${getSessionCookieName(isProduction)}=; ${cookieAttributes(isProduction).join('; ')}; Max-Age=0`;
}

export function extractSessionToken(cookieHeader: string | undefined, isProduction: boolean): string | null {
  if (!cookieHeader) return null;
  const expectedName = getSessionCookieName(isProduction);
  const matches: string[] = [];

  for (const segment of cookieHeader.split(';')) {
    const separatorIndex = segment.indexOf('=');
    if (separatorIndex < 0) continue;
    const name = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    if (name === expectedName) matches.push(value);
  }

  if (matches.length !== 1 || !JWT_PATTERN.test(matches[0] ?? '')) return null;
  return matches[0] ?? null;
}

export function createSanitizedAuthResponse(user: InternalUser) {
  if (!isInternalUser(user)) throw new Error('Invalid sanitized user');
  return { verified: true as const, user: { ...user } };
}

export function isExpectedBrowserOrigin(origin: string | undefined, appOrigin: string): boolean {
  return origin === undefined || origin === appOrigin;
}
