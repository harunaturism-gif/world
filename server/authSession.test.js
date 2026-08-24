import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSessionRpContext,
  getVerifiedWorldSession,
  isValidProofPayload,
  isValidWorldRpId,
} from './authSession.js';

const validSessionId = `session_${'a1'.repeat(64)}`;

function validVerification(overrides = {}) {
  return {
    success: true,
    environment: 'production',
    results: [{ identifier: 'proof_of_human', success: true }],
    session_id: validSessionId,
    ...overrides,
  };
}

test('accepts a valid production proof-of-human verification result', () => {
  assert.deepEqual(getVerifiedWorldSession(validVerification()), {
    sessionId: validSessionId,
    verification: 'proof_of_human',
  });
});

test('rejects top-level success with no results', () => {
  assert.equal(getVerifiedWorldSession(validVerification({ results: undefined })), null);
});

test('rejects a successful unrelated credential', () => {
  assert.equal(getVerifiedWorldSession(validVerification({
    results: [{ identifier: 'document', success: true }],
  })), null);
});

test('rejects a failed proof-of-human result', () => {
  assert.equal(getVerifiedWorldSession(validVerification({
    results: [{ identifier: 'proof_of_human', success: false }],
  })), null);
});

test('rejects a staging verification result', () => {
  assert.equal(getVerifiedWorldSession(validVerification({ environment: 'staging' })), null);
});

test('rejects a malformed session ID', () => {
  assert.equal(getVerifiedWorldSession(validVerification({ session_id: 'session_abc123' })), null);
});

test('rejects a missing session ID', () => {
  assert.equal(getVerifiedWorldSession(validVerification({ session_id: undefined })), null);
});

test('rejects an invalid World RP ID', () => {
  assert.equal(isValidWorldRpId('app_not-an-rp'), false);
  assert.equal(isValidWorldRpId('rp_'), false);
  assert.equal(isValidWorldRpId(null), false);
});

test('creates an actionless session signing request', () => {
  let capturedOptions;
  const fakeSigner = (options) => {
    capturedOptions = options;
    return {
      sig: '0xsignature',
      nonce: '0xnonce',
      createdAt: 100,
      expiresAt: 200,
    };
  };

  assert.deepEqual(createSessionRpContext('server-secret', 'rp_test', fakeSigner), {
    sig: '0xsignature',
    nonce: '0xnonce',
    created_at: 100,
    expires_at: 200,
    rp_id: 'rp_test',
  });
  assert.deepEqual(capturedOptions, { signingKeyHex: 'server-secret' });
  assert.equal(Object.hasOwn(capturedOptions, 'action'), false);
});

test('accepts only non-null, non-array object proof bodies', () => {
  assert.equal(isValidProofPayload({ protocol_version: '4.0' }), true);
  assert.equal(isValidProofPayload(null), false);
  assert.equal(isValidProofPayload([]), false);
  assert.equal(isValidProofPayload('proof'), false);
  assert.equal(isValidProofPayload(42), false);
});
