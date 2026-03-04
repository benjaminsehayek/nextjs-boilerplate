import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to reset the module between tests because the store is module-level state
// Use dynamic import to get a fresh instance for time-manipulation tests

describe('checkRateLimit', () => {
  // Use a unique key per test to avoid cross-test pollution
  let keyIndex = 0;
  function freshKey(): string {
    return `test-user-${++keyIndex}-${Math.random().toString(36).slice(2)}`;
  }

  // Re-import after each beforeEach to pick up fresh module state
  let checkRateLimit: (key: string, limit: number, windowMs?: number) => { allowed: boolean; remaining: number; resetIn: number };

  beforeEach(async () => {
    // Dynamically import so we can reset vi.useFakeTimers state per test
    const mod = await import('./rateLimit');
    checkRateLimit = mod.checkRateLimit;
    vi.useRealTimers();
  });

  it('first request should be allowed', () => {
    const key = freshKey();
    const result = checkRateLimit(key, 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('request exactly at the limit should still be allowed', () => {
    const key = freshKey();
    const limit = 3;
    // Use up limit-1 requests first
    checkRateLimit(key, limit);
    checkRateLimit(key, limit);
    // This is the limit-th request
    const result = checkRateLimit(key, limit);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('request over the limit should be rejected', () => {
    const key = freshKey();
    const limit = 3;
    checkRateLimit(key, limit); // 1
    checkRateLimit(key, limit); // 2
    checkRateLimit(key, limit); // 3 — at limit
    const result = checkRateLimit(key, limit); // 4 — over limit
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it('after window expires, request should be allowed again', () => {
    vi.useFakeTimers();
    const key = freshKey();
    const limit = 1;
    const windowMs = 1000;

    checkRateLimit(key, limit, windowMs); // 1st — allowed, window starts
    const overLimit = checkRateLimit(key, limit, windowMs); // 2nd — rejected
    expect(overLimit.allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(windowMs + 1);

    const afterExpiry = checkRateLimit(key, limit, windowMs);
    expect(afterExpiry.allowed).toBe(true);
    vi.useRealTimers();
  });

  it('different user keys should have independent limits', () => {
    const keyA = freshKey();
    const keyB = freshKey();
    const limit = 2;

    checkRateLimit(keyA, limit); // A: 1
    checkRateLimit(keyA, limit); // A: 2 — at limit
    const aBlocked = checkRateLimit(keyA, limit); // A: over
    expect(aBlocked.allowed).toBe(false);

    // B should still be unaffected
    const bAllowed = checkRateLimit(keyB, limit);
    expect(bAllowed.allowed).toBe(true);
    expect(bAllowed.remaining).toBe(1);
  });
});
