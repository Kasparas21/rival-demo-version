import { hydrateMetaAdCardForLibrary, isMetaAdActive } from "@/lib/ad-library/count-active-ads";
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
