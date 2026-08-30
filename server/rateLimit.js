export class FixedWindowRateLimiter {
    entries = new Map();
    limit;
    maxKeys;
    windowMs;
    constructor(options) {
        if (!Number.isSafeInteger(options.limit) || options.limit < 1
            || !Number.isSafeInteger(options.windowMs) || options.windowMs < 1
            || (options.maxKeys !== undefined
                && (!Number.isSafeInteger(options.maxKeys) || options.maxKeys < 1))) {
            throw new Error('Invalid rate-limit configuration');
        }
        this.limit = options.limit;
        this.maxKeys = options.maxKeys ?? 10_000;
        this.windowMs = options.windowMs;
    }
    consume(key, now = Date.now()) {
        if (key.length === 0 || !Number.isFinite(now))
            return this.denied(this.windowMs);
        const existing = this.entries.get(key);
        if (existing && existing.resetAt > now) {
            if (existing.count >= this.limit)
                return this.denied(existing.resetAt - now);
            existing.count += 1;
            return {
                allowed: true,
                remaining: this.limit - existing.count,
                retryAfterSeconds: 0,
            };
        }
        if (!existing && this.entries.size >= this.maxKeys) {
            this.pruneExpired(now);
            if (this.entries.size >= this.maxKeys)
                return this.denied(this.windowMs);
        }
        this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
        return {
            allowed: true,
            remaining: this.limit - 1,
            retryAfterSeconds: 0,
        };
    }
    denied(milliseconds) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil(milliseconds / 1_000)),
        };
    }
    pruneExpired(now) {
        for (const [key, entry] of this.entries) {
            if (entry.resetAt <= now)
                this.entries.delete(key);
        }
    }
}
export function parseTrustedProxyHops(value) {
    if (value === undefined || value === '')
        return 0;
    if (!/^[0-3]$/.test(value))
        return null;
    return Number(value);
}
//# sourceMappingURL=rateLimit.js.map