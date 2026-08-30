export interface FixedWindowRateLimitOptions {
    readonly limit: number;
    readonly maxKeys?: number;
    readonly windowMs: number;
}
export interface RateLimitDecision {
    readonly allowed: boolean;
    readonly remaining: number;
    readonly retryAfterSeconds: number;
}
export declare class FixedWindowRateLimiter {
    private readonly entries;
    private readonly limit;
    private readonly maxKeys;
    private readonly windowMs;
    constructor(options: FixedWindowRateLimitOptions);
    consume(key: string, now?: number): RateLimitDecision;
    private denied;
    private pruneExpired;
}
export declare function parseTrustedProxyHops(value: string | undefined): number | null;
//# sourceMappingURL=rateLimit.d.ts.map