import { extractSessionToken, signApplicationSession, verifyApplicationSession } from './appSession.js';
export const MAX_POST_LENGTH = 2_000;
export const MAX_ROOM_NAME_LENGTH = 80;
export const MAX_ROOM_TYPE_LENGTH = 32;
export const MAX_BIO_LENGTH = 280;
const INTERNAL_USER_ID_PATTERN = /^user_[0-9a-f]{64}$/;
const USERNAME_PATTERN = /^Human_[0-9A-F]{8}$/;
const ROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ROOM_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
const HEX_COLOR_MAX = 0xffffff;
const HAIR_STYLES = new Set(['short', 'wave', 'buzz']);
export async function persistVerifiedIdentity(repository, user) {
    const profile = await repository.upsertVerifiedProfile(user);
    if (profile.id !== user.id || profile.username !== user.username || profile.verification_status !== true) {
        throw new Error('Verified profile persistence failed');
    }
    return profile;
}
export async function issuePersistedApplicationSession(repository, user, sessionSecret) {
    await persistVerifiedIdentity(repository, user);
    return signApplicationSession(user, sessionSecret);
}
function isPlainObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function hasExactKeys(value, keys) {
    return Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}
function isSafeIntegerColor(value) {
    return Number.isInteger(value) && value >= 0 && value <= HEX_COLOR_MAX;
}
export function isInternalUserId(value) {
    return typeof value === 'string' && INTERNAL_USER_ID_PATTERN.test(value);
}
export function isUsername(value) {
    return typeof value === 'string' && USERNAME_PATTERN.test(value);
}
export function isRoomId(value) {
    return typeof value === 'string' && ROOM_ID_PATTERN.test(value);
}
export function createPersistenceConfig(environment) {
    const isDevelopment = environment.NODE_ENV === 'development';
    const mockEnabled = environment.ENABLE_DEV_MOCK_PERSISTENCE === 'true';
    const supabaseUrl = environment.SUPABASE_URL;
    const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY;
    if (isDevelopment && mockEnabled && !supabaseUrl && !serviceRoleKey) {
        return { mode: 'development-mock' };
    }
    if (!supabaseUrl || supabaseUrl !== supabaseUrl.trim()
        || !serviceRoleKey || serviceRoleKey !== serviceRoleKey.trim()
        || serviceRoleKey.length < 32
        || serviceRoleKey === 'mock-service-role-key') {
        return null;
    }
    try {
        const parsed = new URL(supabaseUrl);
        if ((parsed.protocol !== 'https:' && !(isDevelopment && parsed.protocol === 'http:'))
            || parsed.username || parsed.password || parsed.search || parsed.hash
            || supabaseUrl !== parsed.origin) {
            return null;
        }
    }
    catch {
        return null;
    }
    return { mode: 'supabase', serviceRoleKey, supabaseUrl };
}
export function authenticatePersistenceRequest(input) {
    if (!input.config)
        return { accepted: false, statusCode: 503 };
    if (input.originHeader !== input.config.appOrigin)
        return { accepted: false, statusCode: 403 };
    const token = extractSessionToken(input.cookieHeader, input.config.isProduction);
    const user = token
        ? verifyApplicationSession(token, input.config.sessionSecret, input.now)
        : null;
    return user ? { accepted: true, user } : { accepted: false, statusCode: 401 };
}
export function parseCreatePostInput(value) {
    if (!isPlainObject(value) || !hasExactKeys(value, ['content', 'roomId']))
        return null;
    if (typeof value.content !== 'string' || value.content !== value.content.trim()
        || value.content.length < 1 || value.content.length > MAX_POST_LENGTH)
        return null;
    if (value.roomId !== null && !isRoomId(value.roomId))
        return null;
    return { content: value.content, roomId: value.roomId };
}
export function parseCreateRoomInput(value) {
    if (!isPlainObject(value) || !hasExactKeys(value, ['name', 'type']))
        return null;
    if (typeof value.name !== 'string' || value.name !== value.name.trim()
        || value.name.length < 1 || value.name.length > MAX_ROOM_NAME_LENGTH)
        return null;
    if (typeof value.type !== 'string' || value.type.length > MAX_ROOM_TYPE_LENGTH
        || !ROOM_TYPE_PATTERN.test(value.type))
        return null;
    return { name: value.name, type: value.type };
}
export function parseAvatarAppearance(value) {
    const keys = ['accessoryColor', 'baseColor', 'hair', 'hairColor', 'outfitColor'];
    if (!isPlainObject(value) || !hasExactKeys(value, keys))
        return null;
    if (!isSafeIntegerColor(value.baseColor) || !isSafeIntegerColor(value.hairColor)
        || !isSafeIntegerColor(value.outfitColor) || !isSafeIntegerColor(value.accessoryColor)
        || typeof value.hair !== 'string' || !HAIR_STYLES.has(value.hair))
        return null;
    return {
        accessoryColor: value.accessoryColor,
        baseColor: value.baseColor,
        hair: value.hair,
        hairColor: value.hairColor,
        outfitColor: value.outfitColor,
    };
}
export function parsePostId(value) {
    if (typeof value !== 'string' || !/^[1-9][0-9]{0,14}$/.test(value))
        return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
}
export function slugForRoom(name, suffix) {
    const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '').slice(0, 48) || 'space';
    return `${base}-${suffix.toLowerCase()}`.slice(0, 64).replace(/-+$/g, '');
}
//# sourceMappingURL=persistence.js.map