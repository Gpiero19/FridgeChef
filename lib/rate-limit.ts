// In-memory per-IP sliding-window rate limiter.
//
// ponytail: state lives in a plain Map in serverless-instance memory — it resets
// on cold start and is not shared across instances/regions. This throttles casual
// abuse and bot loops but is NOT a globally durable limit. SPEC-05 upgrades this
// to Upstash Redis for a shared, durable counter.
//
// ADR-005 (ARCHITECTURE.md): only /api/suggest-recipes calls this — extraction is
// exempt so photo users aren't penalized relative to text users.

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const LIMIT = 5;

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller's oldest request falls out of the window. */
  retryAfterSeconds: number;
}

/**
 * Records a hit for `key` (typically client IP) and reports whether it is
 * within the 5-per-hour sliding window. `now` is injectable for tests.
 */
export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const windowStart = now - WINDOW_MS;
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= LIMIT) {
    const oldest = timestamps[0] ?? now;
    buckets.set(key, timestamps);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test-only: clears all buckets so tests don't leak state across cases. */
export function __resetRateLimitState(): void {
  buckets.clear();
}
