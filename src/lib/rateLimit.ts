// In-memory rate limiter (per Vercel instance — good enough for abuse prevention)
// Resets every 60 seconds per user

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Sweep expired entries every 5 minutes to prevent unbounded Map growth.
// On Vercel serverless, each instance is short-lived so the interval may
// never fire — but on long-lived instances (self-hosted, dev server) it
// prevents the Map from accumulating stale keys for every unique user ID
// that has ever made a request.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, CLEANUP_INTERVAL_MS).unref?.(); // .unref() so Node.js doesn't keep the process alive for this alone
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetAt - now };
}
