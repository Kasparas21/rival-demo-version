import { Redis } from "@upstash/redis";

import type { McpAuthContext } from "@/lib/mcp/types";
import { mcpRateLimitKey } from "@/lib/mcp/authenticate";
import { mcpRateLimitedResponse } from "@/lib/mcp/http";
import type { NextResponse } from "next/server";

const MINUTE_LIMIT = 60;
const DAY_LIMIT = 1000;

type Bucket = { minute: number[]; day: number[] };

const memoryBuckets = new Map<string, Bucket>();
let memoryFallbackWarned = false;

function warnMemoryFallbackOnce(): void {
  if (memoryFallbackWarned) return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
    return;
  }
  memoryFallbackWarned = true;
  console.warn(
    "[mcp] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing — rate limiting uses in-memory fallback (not safe across serverless instances)",
  );
}

function prune(ts: number[], windowMs: number, now: number): number[] {
  return ts.filter((t) => now - t < windowMs);
}

function checkMemoryLimit(keyId: string): boolean {
  const now = Date.now();
  const bucket = memoryBuckets.get(keyId) ?? { minute: [], day: [] };
  bucket.minute = prune(bucket.minute, 60_000, now);
  bucket.day = prune(bucket.day, 86_400_000, now);
  if (bucket.minute.length >= MINUTE_LIMIT || bucket.day.length >= DAY_LIMIT) {
    memoryBuckets.set(keyId, bucket);
    return false;
  }
  bucket.minute.push(now);
  bucket.day.push(now);
  memoryBuckets.set(keyId, bucket);
  return true;
}

function redisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function checkRedisLimit(keyId: string): Promise<boolean> {
  const redis = redisClient();
  if (!redis) {
    warnMemoryFallbackOnce();
    return checkMemoryLimit(keyId);
  }

  const minuteKey = `mcp:rl:min:${keyId}`;
  const dayKey = `mcp:rl:day:${keyId}`;

  const [minuteCount, dayCount] = await Promise.all([redis.incr(minuteKey), redis.incr(dayKey)]);

  if (minuteCount === 1) await redis.expire(minuteKey, 60);
  if (dayCount === 1) await redis.expire(dayKey, 86_400);

  return minuteCount <= MINUTE_LIMIT && dayCount <= DAY_LIMIT;
}

export async function enforceMcpRateLimit(auth: McpAuthContext): Promise<NextResponse | null> {
  const ok = await checkRedisLimit(mcpRateLimitKey(auth));
  if (ok) return null;
  return mcpRateLimitedResponse();
}
