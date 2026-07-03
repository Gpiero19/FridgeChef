import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIMIT, __resetRateLimitState, checkRateLimit } from "../lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitState();
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < LIMIT - 1; i++) {
      expect(checkRateLimit("1.1.1.1", Date.now()).allowed).toBe(true);
    }
  });

  it("allows exactly the Nth request at the boundary", () => {
    for (let i = 0; i < LIMIT; i++) {
      expect(checkRateLimit("1.1.1.1", Date.now()).allowed).toBe(true);
    }
  });

  it("blocks the request over the limit and returns Retry-After seconds", () => {
    for (let i = 0; i < LIMIT; i++) {
      checkRateLimit("1.1.1.1", Date.now());
    }
    const result = checkRateLimit("1.1.1.1", Date.now());
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(3600);
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < LIMIT; i++) {
      checkRateLimit("1.1.1.1", Date.now());
    }
    expect(checkRateLimit("1.1.1.1", Date.now()).allowed).toBe(false);

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    expect(checkRateLimit("1.1.1.1", Date.now()).allowed).toBe(true);
  });

  it("isolates distinct IPs into separate buckets", () => {
    for (let i = 0; i < LIMIT; i++) {
      checkRateLimit("1.1.1.1", Date.now());
    }
    expect(checkRateLimit("1.1.1.1", Date.now()).allowed).toBe(false);
    expect(checkRateLimit("2.2.2.2", Date.now()).allowed).toBe(true);
  });
});
