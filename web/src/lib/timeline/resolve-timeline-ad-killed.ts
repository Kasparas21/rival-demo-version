import { resolveMetaAdKilledForDetail } from "@/lib/ad-detail/resolve-meta-ad-killed";
import { isScrapedAdKilled } from "@/lib/ad-library/scraped-ad-lifecycle";

const SWEEP_RECONCILED = new Set(["meta", "google", "youtube", "tiktok"]);

export type TimelineAdKillInput = {
  platform: string;
  last_seen_at: string;
  is_active: boolean | null;
  raw_payload: unknown;
};

/**
 * Same kill rules as `/api/ad-detail` — keeps timeline status in sync with the drawer.
 */
export function resolveTimelineAdKilled(
  ad: TimelineAdKillInput,
  lastScrapedAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  const platformNorm = ad.platform.trim().toLowerCase();

  if (SWEEP_RECONCILED.has(platformNorm)) {
    return (
      ad.is_active === false ||
      (platformNorm === "meta"
        ? resolveMetaAdKilledForDetail(ad.raw_payload, ad.last_seen_at, null, nowMs)
        : false)
    );
  }

  return isScrapedAdKilled(ad.last_seen_at, lastScrapedAt, nowMs);
}

export function resolveTimelineAdRunning(
  ad: TimelineAdKillInput,
  lastScrapedAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  return !resolveTimelineAdKilled(ad, lastScrapedAt, nowMs);
}
