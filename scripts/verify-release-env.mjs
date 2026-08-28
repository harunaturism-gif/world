import { createAdminConfig } from '../server/adminAuthorization.js';
import { createAppSessionConfig } from '../server/appSession.js';
import { isValidWorldRpId } from '../server/authSession.js';
import { createPersistenceConfig } from '../server/persistence.js';

const allowedTargets = new Set(['all', 'backend', 'frontend']);
const target = process.argv[2] ?? 'all';

if (!allowedTargets.has(target)) {
  console.error('Usage: node scripts/verify-release-env.mjs [all|frontend|backend]');
  process.exit(2);
}

const environment = process.env;
const failures = [];
const warnings = [];

function fail(variable, message) {
  failures.push(`${variable}: ${message}`);
}

function present(variable) {
  const value = environment[variable];
  if (typeof value !== 'string' || value.length === 0) {
    fail(variable, 'missing');
    return null;
  }
  if (value !== value.trim()) {
    fail(variable, 'must not contain surrounding whitespace');
    return null;
  }
  if (/x{6,}|your[-_ ]|change[-_ ]?me|example/i.test(value)) {
    fail(variable, 'placeholder value is not allowed');
    return null;
  }
  return value;
}

function productionUrl(variable, protocols) {
  const value = present(variable);
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const localHost = parsed.hostname === 'localhost'
      || parsed.hostname === '127.0.0.1'
      || parsed.hostname === '::1'
      || parsed.hostname.endsWith('.local');
    if (!protocols.includes(parsed.protocol) || parsed.username || parsed.password || localHost) {
      fail(variable, `must be a public ${protocols.join(' or ')} URL without embedded credentials`);
      return null;
    }
    return parsed;
  } catch {
    fail(variable, 'must be an absolute URL');
    return null;
  }
}

function requireFalse(variable) {
  if (environment[variable] !== 'false') fail(variable, 'must be explicitly set to false');
}

function rejectBrowserSecretAliases() {
  const forbidden = [
    'VITE_APP_IDENTITY_SECRET',
    'VITE_APP_SESSION_SECRET',
    'VITE_SUPABASE_SERVICE_ROLE_KEY',
    'VITE_WORLD_RP_SIGNING_KEY',
  ];
  for (const variable of forbidden) {
    if (environment[variable]) fail(variable, 'server secret must never use a VITE_ browser prefix');
  }
}

function verifyFrontend() {
  const backend = productionUrl('VITE_BACKEND_URL', ['https:']);
  const webSocket = productionUrl('VITE_WS_URL', ['wss:']);
  const appId = present('VITE_WORLD_APP_ID');
  if (appId && (!appId.startsWith('app_') || appId.length <= 4)) fail('VITE_WORLD_APP_ID', 'invalid World application ID');
  requireFalse('VITE_ENABLE_DEV_AUTH');
  requireFalse('VITE_ENABLE_DEV_ADMIN');
  rejectBrowserSecretAliases();
  if (backend && webSocket && backend.hostname !== webSocket.hostname) {
    warnings.push('VITE_BACKEND_URL and VITE_WS_URL use different hosts; confirm this is intentional.');
  }
}

function verifyBackend() {
  if (environment.NODE_ENV !== 'production') fail('NODE_ENV', 'must be production');
  const rpId = present('WORLD_RP_ID');
  if (rpId && !isValidWorldRpId(rpId)) fail('WORLD_RP_ID', 'invalid World relying-party ID');
  const signingKey = present('WORLD_RP_SIGNING_KEY');
  if (signingKey && signingKey.length < 16) fail('WORLD_RP_SIGNING_KEY', 'configured value is too short');

  for (const variable of ['APP_ORIGIN', 'APP_SESSION_SECRET', 'APP_IDENTITY_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    present(variable);
  }

  const appSession = createAppSessionConfig(environment);
  if (!appSession || !appSession.isProduction) {
    fail('APP_ORIGIN/APP_*_SECRET', 'application session configuration is invalid or not production-safe');
  }
  const persistence = createPersistenceConfig(environment);
  if (!persistence || persistence.mode !== 'supabase') {
    fail('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY', 'production Supabase configuration is invalid');
  }
  const admin = createAdminConfig(environment);
  if (!admin || admin.developmentAdminEnabled) {
    fail('ADMIN_BOOTSTRAP_USER_IDS/ENABLE_DEV_ADMIN', 'admin configuration is invalid or enables development authorization');
  }

  requireFalse('ENABLE_DEV_MOCK_PERSISTENCE');
  requireFalse('ENABLE_DEV_ADMIN');
  rejectBrowserSecretAliases();

  if (environment.PORT !== undefined && !/^[1-9][0-9]{0,4}$/.test(environment.PORT)) {
    fail('PORT', 'must be an integer from 1 to 99999 when set');
  }
  if (!environment.ADMIN_BOOTSTRAP_USER_IDS) {
    warnings.push('ADMIN_BOOTSTRAP_USER_IDS is empty; confirm at least one owner already exists.');
  } else {
    warnings.push('ADMIN_BOOTSTRAP_USER_IDS is active; remove it after the intended owner bootstrap.');
  }
}

if (target === 'all' || target === 'frontend') verifyFrontend();
if (target === 'all' || target === 'backend') verifyBackend();

console.log(`Human World production environment preflight (${target}).`);
console.log('Configured values are never printed.');

for (const warning of warnings) console.warn(`WARNING: ${warning}`);

if (failures.length > 0) {
  for (const failure of [...new Set(failures)]) console.error(`FAIL: ${failure}`);
  console.error(`Environment preflight failed (${new Set(failures).size} issue(s)).`);
  process.exitCode = 1;
} else {
  console.log('Environment preflight passed.');
}
