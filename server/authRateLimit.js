import { FixedWindowRateLimiter } from './rateLimit.js';
export function createAuthRateLimitMiddleware(limiter) {
    return (request, response, next) => {
        if (request.method !== 'POST')
            return next();
        // Express derives request.ip using the explicitly configured trust-proxy hop
        // count. Never read X-Forwarded-For directly here.
        const clientKey = request.ip || request.socket.remoteAddress || 'unknown-client';
        const decision = limiter.consume(clientKey);
        if (!decision.allowed) {
            response.setHeader('Retry-After', decision.retryAfterSeconds.toString());
            return response.status(429).json({ error: 'Too many authentication requests' });
        }
        return next();
    };
}
//# sourceMappingURL=authRateLimit.js.map