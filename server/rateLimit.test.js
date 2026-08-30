import assert from 'node:assert/strict';
import test from 'node:test';

import { FixedWindowRateLimiter, parseTrustedProxyHops } from './rateLimit.js';

test('allows only the configured requests in a fixed window', () => {
  const limiter = new FixedWindowRateLimiter({ limit: 2, windowMs: 10_000 });
  assert.deepEqual(limiter.consume('client-a', 1_000), { allowed: true, remaining: 1, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.consume('client-a', 1_001), { allowed: true, remaining: 0, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.consume('client-a', 1_002), { allowed: false, remaining: 0, retryAfterSeconds: 10 });
});

test('resets the allowance at the exact window boundary', () => {
  const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1_000 });
  assert.equal(limiter.consume('client-a', 5_000).allowed, true);
  assert.equal(limiter.consume('client-a', 5_999).allowed, false);
  assert.deepEqual(limiter.consume('client-a', 6_000), { allowed: true, remaining: 0, retryAfterSeconds: 0 });
});

test('keeps independent client budgets', () => {
  const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1_000 });
  assert.equal(limiter.consume('client-a', 0).allowed, true);
  assert.equal(limiter.consume('client-a', 1).allowed, false);
  assert.equal(limiter.consume('client-b', 1).allowed, true);
});

test('fails closed when the bounded key store is full', () => {
  const limiter = new FixedWindowRateLimiter({ limit: 1, maxKeys: 1, windowMs: 10_000 });
  assert.equal(limiter.consume('client-a', 0).allowed, true);
  assert.deepEqual(limiter.consume('client-b', 1), { allowed: false, remaining: 0, retryAfterSeconds: 10 });
  assert.equal(limiter.consume('client-b', 10_000).allowed, true);
});

test('rejects empty keys, invalid clocks, and invalid configuration', () => {
  const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1_000 });
  assert.equal(limiter.consume('', 0).allowed, false);
  assert.equal(limiter.consume('client', Number.NaN).allowed, false);
  assert.throws(() => new FixedWindowRateLimiter({ limit: 0, windowMs: 1_000 }));
  assert.throws(() => new FixedWindowRateLimiter({ limit: 1, maxKeys: 0, windowMs: 1_000 }));
});

test('accepts only an explicit bounded trusted-proxy hop count', () => {
  assert.equal(parseTrustedProxyHops(undefined), 0);
  assert.equal(parseTrustedProxyHops(''), 0);
  assert.equal(parseTrustedProxyHops('0'), 0);
  assert.equal(parseTrustedProxyHops('3'), 3);
  for (const invalid of ['-1', '4', '01', 'true', ' 1']) {
    assert.equal(parseTrustedProxyHops(invalid), null);
  }
});
