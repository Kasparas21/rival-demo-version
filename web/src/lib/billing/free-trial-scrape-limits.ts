import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";

function clampAds(n: number): number {
  return Math.max(1, Math.min(n, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
}

/** Free trial: 200 ads/platform on the one allowed initial scrape. */
export function applyFreeTrialInitialScrapeLimits(fields: ScrapeRequestFields): ScrapeRequestFields {
  const cap = 200;
  return {
    ...fields,
    metaMaxAds: clampAds(cap),
    linkedinMaxAds: clampAds(cap),
    tiktokMaxAds: clampAds(cap),
    pinterestMaxResults: clampAds(cap),
    snapchatMaxItems: clampAds(cap),
  };
}
