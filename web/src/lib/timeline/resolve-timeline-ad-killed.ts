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
 *
 * Meta / Google / TikTok scrapes run every few days; between sweeps the DB `is_active`
 * flag (and Meta payload at `last_scraped_at`) is authoritative — not “last seen today”.
 */
export function resolveTimelineAdKilled(
  ad: TimelineAdKillInput,
  lastScrapedAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  const platformNorm = ad.platform.trim().toLowerCase();

  if (SWEEP_RECONCILED.has(platformNorm)) {
    if (ad.is_active === false) return true;
    if (platformNorm === "meta") {
      return resolveMetaAdKilledForDetail(
        ad.raw_payload,
        ad.last_seen_at,
        lastScrapedAt,
        nowMs,
      );
    }
    /** google / youtube / tiktok: `is_active` is updated only on sweeps — hold until next scrape. */
    return false;
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
