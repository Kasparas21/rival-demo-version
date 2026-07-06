import type { AdLibraryRegionPrefs } from "@/lib/ad-library/ad-library-region-prefs";
import { inferAdLibraryRegionDefaults } from "@/lib/ad-library/infer-ad-library-regions-from-domain";
import { normalizeGoogleAdsRegion } from "@/lib/ad-library/google-ads-regions";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import { normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";

export type PersistedAdLibraryRegions = Partial<AdLibraryRegionPrefs>;

function parseRegionsFromContext(raw: unknown): PersistedAdLibraryRegions | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const regions = (raw as { regions?: unknown }).regions;
  if (!regions || typeof regions !== "object" || Array.isArray(regions)) return null;
  return regions as PersistedAdLibraryRegions;
}

/** Region prefs for scheduled / manual cron scrapes — persisted on competitor or inferred from domain. */
export function resolveScheduledScrapeRegions(
  brandDomain: string | null | undefined,
  adsLibraryContext: unknown,
): AdLibraryRegionPrefs {
  const fromContext = parseRegionsFromContext(adsLibraryContext);
  const inferred = inferAdLibraryRegionDefaults(brandDomain);

  const metaRaw = fromContext?.metaCountry ?? inferred.metaCountry;
  const linkedinRaw = fromContext?.linkedinCountryCode ?? inferred.linkedinCountryCode;

  return {
    metaCountry: metaRaw.trim().toUpperCase() || "ALL",
    googleRegion: normalizeGoogleAdsRegion(fromContext?.googleRegion ?? inferred.googleRegion),
    tiktokRegion: normalizeTikTokAdsRegion(fromContext?.tiktokRegion ?? inferred.tiktokRegion),
    pinterestCountry: normalizePinterestAdsCountry(
      fromContext?.pinterestCountry ?? inferred.pinterestCountry,
    ),
    linkedinCountryCode: linkedinRaw.trim().toUpperCase() === "ALL" ? "" : linkedinRaw.trim().toUpperCase(),
    snapchatCountry: (fromContext?.snapchatCountry ?? inferred.snapchatCountry).trim().toUpperCase() || "DE",
  };
}

export function regionsToPersistedPayload(
  regions: AdLibraryRegionPrefs,
): NonNullable<import("@/lib/account/types").AdsLibraryContextPayload["regions"]> {
  return {
    metaCountry: regions.metaCountry,
    googleRegion: regions.googleRegion,
    tiktokRegion: regions.tiktokRegion,
    pinterestCountry: regions.pinterestCountry,
    linkedinCountryCode: regions.linkedinCountryCode,
    snapchatCountry: regions.snapchatCountry,
  };
}
