import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthRateLimitMiddleware } from './authRateLimit.js';
import { FixedWindowRateLimiter } from './rateLimit.js';

function invoke(middleware, { forwardedFor, ip = '203.0.113.1', method = 'POST' } = {}) {
  const result = { body: null, headers: {}, nextCalled: false, statusCode: 200 };
  const request = {
    headers: { 'x-forwarded-for': forwardedFor },
    ip,
    method,
    socket: { remoteAddress: '198.51.100.1' },
  };
  const response = {
    json(body) { result.body = body; return this; },
    setHeader(name, value) { result.headers[name] = value; },
    status(statusCode) { result.statusCode = statusCode; return this; },
  };
  middleware(request, response, () => { result.nextCalled = true; });
  return result;
}

test('authentication middleware returns a sanitized 429 after the per-IP budget', () => {
  const middleware = createAuthRateLimitMiddleware(new FixedWindowRateLimiter({ limit: 2, windowMs: 60_000 }));
  assert.equal(invoke(middleware).nextCalled, true);
  assert.equal(invoke(middleware).nextCalled, true);
  assert.deepEqual(invoke(middleware), {
    body: { error: 'Too many authentication requests' },
    headers: { 'Retry-After': '60' },
    nextCalled: false,
    statusCode: 429,
  });
});

test('authentication middleware uses Express trusted IP and ignores raw forwarded headers', () => {
  const middleware = createAuthRateLimitMiddleware(new FixedWindowRateLimiter({ limit: 1, windowMs: 60_000 }));
  assert.equal(invoke(middleware, { forwardedFor: '1.1.1.1', ip: '203.0.113.1' }).nextCalled, true);
  assert.equal(invoke(middleware, { forwardedFor: '2.2.2.2', ip: '203.0.113.1' }).statusCode, 429);
  assert.equal(invoke(middleware, { forwardedFor: '1.1.1.1', ip: '203.0.113.2' }).nextCalled, true);
});

test('non-POST requests do not consume the authentication budget', () => {
  const middleware = createAuthRateLimitMiddleware(new FixedWindowRateLimiter({ limit: 1, windowMs: 60_000 }));
  assert.equal(invoke(middleware, { method: 'GET' }).nextCalled, true);
  assert.equal(invoke(middleware).nextCalled, true);
});
