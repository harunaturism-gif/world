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

interface WindowEntry {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, WindowEntry>();
  private readonly limit: number;
  private readonly maxKeys: number;
  private readonly windowMs: number;

  constructor(options: FixedWindowRateLimitOptions) {
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

  consume(key: string, now = Date.now()): RateLimitDecision {
    if (key.length === 0 || !Number.isFinite(now)) return this.denied(this.windowMs);

    const existing = this.entries.get(key);
    if (existing && existing.resetAt > now) {
      if (existing.count >= this.limit) return this.denied(existing.resetAt - now);
      existing.count += 1;
      return {
        allowed: true,
        remaining: this.limit - existing.count,
        retryAfterSeconds: 0,
      };
    }

    if (!existing && this.entries.size >= this.maxKeys) {
      this.pruneExpired(now);
      if (this.entries.size >= this.maxKeys) return this.denied(this.windowMs);
    }

    this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
    return {
      allowed: true,
      remaining: this.limit - 1,
      retryAfterSeconds: 0,
    };
  }

  private denied(milliseconds: number): RateLimitDecision {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(milliseconds / 1_000)),
    };
  }

  private pruneExpired(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}

export function parseTrustedProxyHops(value: string | undefined): number | null {
  if (value === undefined || value === '') return 0;
  if (!/^[0-3]$/.test(value)) return null;
  return Number(value);
}
