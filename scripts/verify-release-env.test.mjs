import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./verify-release-env.mjs', import.meta.url));
const controlledVariables = [
  'ADMIN_BOOTSTRAP_USER_IDS',
  'APP_IDENTITY_SECRET',
  'APP_ORIGIN',
  'APP_SESSION_SECRET',
  'ENABLE_DEV_ADMIN',
  'ENABLE_DEV_MOCK_PERSISTENCE',
  'NODE_ENV',
  'PORT',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'TRUST_PROXY_HOPS',
  'VITE_APP_IDENTITY_SECRET',
  'VITE_APP_SESSION_SECRET',
  'VITE_BACKEND_URL',
  'VITE_ENABLE_DEV_ADMIN',
  'VITE_ENABLE_DEV_AUTH',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_WORLD_APP_ID',
  'VITE_WORLD_RP_SIGNING_KEY',
  'VITE_WS_URL',
  'WORLD_RP_ID',
  'WORLD_RP_SIGNING_KEY',
];

function cleanEnvironment() {
  const environment = { ...process.env };
  for (const variable of controlledVariables) delete environment[variable];
  return environment;
}

const validFrontend = {
  VITE_BACKEND_URL: 'https://api.human.world',
  VITE_ENABLE_DEV_ADMIN: 'false',
  VITE_ENABLE_DEV_AUTH: 'false',
  VITE_WORLD_APP_ID: 'app_humanworld123',
  VITE_WS_URL: 'wss://api.human.world',
};

const validBackend = {
  ADMIN_BOOTSTRAP_USER_IDS: `user_${'a'.repeat(64)}`,
  APP_IDENTITY_SECRET: 'identity-secret-9876543210-ABCDEFGHIJ',
  APP_ORIGIN: 'https://app.human.world',
  APP_SESSION_SECRET: 'session-secret-1234567890-ABCDEFGHIJK',
  ENABLE_DEV_ADMIN: 'false',
  ENABLE_DEV_MOCK_PERSISTENCE: 'false',
  NODE_ENV: 'production',
  PORT: '3001',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-1234567890-ABCDEFGHIJ',
  SUPABASE_URL: 'https://human-world.supabase.co',
  TRUST_PROXY_HOPS: '1',
  WORLD_RP_ID: 'rp_humanworld123',
  WORLD_RP_SIGNING_KEY: 'signing-key-1234567890-ABCDEFGHIJ',
};

function run(target, overrides = {}) {
  return spawnSync(process.execPath, [script, target], {
    encoding: 'utf8',
    env: { ...cleanEnvironment(), ...validFrontend, ...validBackend, ...overrides },
  });
}

test('complete production configuration passes without printing values', () => {
  const result = run('all');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Environment preflight passed/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /session-secret-1234567890/);
});

test('frontend rejects development authorization and browser-prefixed secrets', () => {
  const secret = 'never-print-this-browser-secret';
  const result = run('frontend', { VITE_ENABLE_DEV_ADMIN: 'true', VITE_SUPABASE_SERVICE_ROLE_KEY: secret });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /VITE_ENABLE_DEV_ADMIN/);
  assert.match(result.stderr, /VITE_SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
});

test('backend rejects shared application secrets and development persistence', () => {
  const shared = 'shared-secret-1234567890-ABCDEFGHIJK';
  const result = run('backend', {
    APP_IDENTITY_SECRET: shared,
    APP_SESSION_SECRET: shared,
    ENABLE_DEV_MOCK_PERSISTENCE: 'true',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /APP_ORIGIN\/APP_\*_SECRET/);
  assert.match(result.stderr, /ENABLE_DEV_MOCK_PERSISTENCE/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(shared));
});

test('backend rejects malformed owner bootstrap IDs', () => {
  const result = run('backend', { ADMIN_BOOTSTRAP_USER_IDS: 'Human_Admin' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ADMIN_BOOTSTRAP_USER_IDS/);
});

test('frontend rejects paths, query strings, fragments, and trailing slashes in service origins', () => {
  for (const VITE_BACKEND_URL of [
    'https://api.human.world/api',
    'https://api.human.world?region=eu',
    'https://api.human.world#backend',
    'https://api.human.world/',
  ]) {
    const result = run('frontend', { VITE_BACKEND_URL });
    assert.equal(result.status, 1, VITE_BACKEND_URL);
    assert.match(result.stderr, /VITE_BACKEND_URL/);
  }

  for (const VITE_WS_URL of [
    'wss://api.human.world/socket',
    'wss://api.human.world?token=forbidden',
    'wss://api.human.world#socket',
    'wss://api.human.world/',
  ]) {
    const result = run('frontend', { VITE_WS_URL });
    assert.equal(result.status, 1, VITE_WS_URL);
    assert.match(result.stderr, /VITE_WS_URL/);
  }
});

test('backend rejects unsafe trusted-proxy configuration', () => {
  for (const TRUST_PROXY_HOPS of ['-1', '4', '01', 'true', ' 1']) {
    const result = run('backend', { TRUST_PROXY_HOPS });
    assert.equal(result.status, 1, TRUST_PROXY_HOPS);
    assert.match(result.stderr, /TRUST_PROXY_HOPS/);
  }
});
