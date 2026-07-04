import { isMetaAdActive } from "@/lib/ad-library/count-active-ads";
import type { MetaAdCard } from "@/lib/ad-library/normalize";
import { metaCardForLifecycle } from "@/lib/ad-library/meta-payload-lifecycle";
import { isScrapedAdKilled } from "@/lib/ad-library/scraped-ad-lifecycle";

/**
 * Detail-drawer kill state for Meta ads: missing from the latest scrape **or**
 * explicitly ended/inactive in the scraped Meta payload.
 */
export function resolveMetaAdKilledForDetail(
  rawPayload: unknown,
  lastSeenAt: string,
  lastScrapedAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  const scrapeKilled = isScrapedAdKilled(lastSeenAt, lastScrapedAt, nowMs);
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return scrapeKilled;
  }

  const scrapeAtMs = lastScrapedAt?.trim() ? Date.parse(lastScrapedAt.trim()) : undefined;
  const card = metaCardForLifecycle(rawPayload, scrapeAtMs);
  const metaKilled = card ? !isMetaAdActive(card, scrapeAtMs, nowMs) : false;
  return scrapeKilled || metaKilled;
}

/** Running state for ads-library cards — mirrors ad-detail kill rules. */
export function isMetaRunningForLibraryRow(params: {
  rawPayload: unknown;
  lastSeenAt: string | null | undefined;
  lastScrapedAt: string | null | undefined;
  isActiveDb?: boolean | null;
  nowMs?: number;
}): boolean {
  if (params.isActiveDb === false) return false;

  const lastSeen = params.lastSeenAt?.trim();
  if (!lastSeen) {
    const scrapeAtMs = params.lastScrapedAt?.trim() ? Date.parse(params.lastScrapedAt.trim()) : undefined;
    if (!params.rawPayload || typeof params.rawPayload !== "object" || Array.isArray(params.rawPayload)) {
      return false;
    }
    const card = metaCardForLifecycle(params.rawPayload, scrapeAtMs);
    return card ? isMetaAdActive(card, scrapeAtMs, params.nowMs) : false;
  }

  return !resolveMetaAdKilledForDetail(
    params.rawPayload,
    lastSeen,
    params.lastScrapedAt,
    params.nowMs
  );
}

/** Cache-only Meta card (no DB last_seen) — recover lifecycle fields from payload. */
export function isMetaCacheCardKilled(ad: MetaAdCard, scrapeAtMs?: number, nowMs = Date.now()): boolean {
  const card = metaCardForLifecycle(ad, scrapeAtMs);
  if (!card) return true;
  return !isMetaAdActive(card, scrapeAtMs, nowMs);
}
