import { NextResponse } from "next/server";

import { hitRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Routes a dashboard and competitor page load calls, covering every function group (default, 60, 120 and
 * 300 s limits, and the pages). Signed out, each answers 401/405 without doing any work: the request only
 * boots the function, so the next real visitor doesn't wait a second for a cold start.
 */
const WARM_PATHS = [
  "/login",
  "/api/autopilot/settings",
  "/api/account/scrape-status",
  "/api/account/recent-platform-refreshes",
  "/api/account/usage",
  "/api/account/profile",
  "/api/account/brands",
  "/api/account/ad-platforms",
  "/api/account/saved-competitors",
  "/api/alerts/unread-count",
  "/api/comparison/payload",
  "/api/comparison/vault-ads",
  "/api/brand-comparison",
  "/api/ads/library",
  "/api/competitor/ads-library/hydrate",
  "/api/competitor/ads-library/ensure-persisted",
  "/api/competitor/activity-score",
  "/api/competitor/manual-refresh-status",
  "/api/competitor/platform-tracking",
  "/api/competitor/library-lifecycle",
  "/api/saved-items",
  "/api/saved-ads/check",
  "/api/landing-pages",
  "/api/timeline",
  "/api/creative-tests",
  "/api/discover",
] as const;

const PER_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Keep-warm ping for an uptime monitor (every 5 minutes). Public, but it fans out at most once a minute
 * however often it's called, so it can't be used to multiply traffic.
 */
export async function GET(request: Request) {
  if (!(await hitRateLimit("warm:fanout", [{ windowSec: 60, max: 1 }]))) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const origin = new URL(request.url).origin;
  const started = Date.now();
  const results = await Promise.all(
    WARM_PATHS.map(async (path) => {
      const t = Date.now();
      try {
        const res = await fetch(`${origin}${path}`, {
          headers: { "x-rival-warm": "1" },
          redirect: "manual",
          cache: "no-store",
          signal: AbortSignal.timeout(PER_REQUEST_TIMEOUT_MS),
        });
        await res.body?.cancel();
        return { path, status: res.status, ms: Date.now() - t };
      } catch {
        return { path, status: 0, ms: Date.now() - t };
      }
    }),
  );
  return NextResponse.json({ ok: true, ms: Date.now() - started, results });
}
