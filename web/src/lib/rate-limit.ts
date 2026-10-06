import { Redis } from "@upstash/redis";

/**
 * Fixed-window rate limits backed by Upstash Redis. Production has Vercel KV's `KV_REST_API_URL` /
 * `KV_REST_API_TOKEN` (the same Upstash REST API); `UPSTASH_REDIS_REST_*` also works. Without either it
 * falls back to a per-instance in-memory counter, which serverless instances don't share.
 */

export type RateLimitWindow = { windowSec: number; max: number };

let cachedRedis: Redis | null | undefined;
let memoryFallbackWarned = false;
const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export function redisRestCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

function redis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const creds = redisRestCredentials();
  cachedRedis = creds ? new Redis(creds) : null;
  return cachedRedis;
}

function warnMemoryFallbackOnce(): void {
  if (memoryFallbackWarned || process.env.NODE_ENV !== "production") return;
  memoryFallbackWarned = true;
  console.warn(
    "[rate-limit] No KV_REST_API_* / UPSTASH_REDIS_REST_* credentials — using in-memory counters (not shared across instances)",
  );
}

function memoryIncr(key: string, windowSec: number): number {
  const now = Date.now();
  const entry = memoryCounters.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryCounters.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/**
 * Counts one hit for `key` in every window; false when any window is over its max.
 * Redis errors fail open (allow) so an outage never locks users out of sign-in.
 */
export async function hitRateLimit(key: string, windows: readonly RateLimitWindow[]): Promise<boolean> {
  const client = redis();
  if (!client) {
    warnMemoryFallbackOnce();
    return windows.every((w) => memoryIncr(`${key}:${w.windowSec}`, w.windowSec) <= w.max);
  }

  try {
    const counts = await Promise.all(
      windows.map(async (w) => {
        const windowKey = `rl:${key}:${w.windowSec}`;
        const count = await client.incr(windowKey);
        if (count === 1) await client.expire(windowKey, w.windowSec);
        return count;
      }),
    );
    return counts.every((count, i) => count <= windows[i]!.max);
  } catch (e) {
    console.warn("[rate-limit] redis error, allowing request", e instanceof Error ? e.message : e);
    return true;
  }
}

/** Client IP from Vercel's forwarding headers (first hop), or "unknown". */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Limits for public endpoints that send email or spend paid API credits. */
export const PUBLIC_EMAIL_LIMITS = {
  perIp: [
    { windowSec: 60, max: 5 },
    { windowSec: 3600, max: 20 },
  ],
  perEmail: [
    { windowSec: 600, max: 3 },
    { windowSec: 86_400, max: 10 },
  ],
} as const satisfies Record<string, readonly RateLimitWindow[]>;

export const PUBLIC_PAID_LOOKUP_LIMITS = {
  perIp: [
    { windowSec: 60, max: 10 },
    { windowSec: 86_400, max: 100 },
  ],
} as const satisfies Record<string, readonly RateLimitWindow[]>;
