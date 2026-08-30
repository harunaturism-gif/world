import type { RequestHandler } from 'express';
import { FixedWindowRateLimiter } from './rateLimit.js';
export declare function createAuthRateLimitMiddleware(limiter: FixedWindowRateLimiter): RequestHandler;
//# sourceMappingURL=authRateLimit.d.ts.map