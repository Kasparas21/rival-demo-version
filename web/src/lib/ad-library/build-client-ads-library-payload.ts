import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";
import { GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT } from "@/lib/ad-library/constants";
import { normalizedBrandForAdsLibraryPayload } from "@/lib/ad-library/deduped-fetch";
import {
  DEFAULT_GOOGLE_ADS_REGION,
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import { readGoogleAdDetailsPublicFlag } from "@/lib/ad-library/public-env-flags";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import { DEFAULT_TIKTOK_ADS_REGION, normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";

/** Payload shape for `/api/ads/library` + `stableAdsLibraryPayloadKey` (must match `useAdLibrary`). */
export function buildClientAdsLibraryPayload(params: {
  brand: { name: string; domain: string; logoUrl?: string };
  ids: Record<string, string> | null | undefined;
  adsPlatforms: readonly AdsLibraryPlatform[];
  scrapeFields: ScrapeRequestFields;
  tiktokRegion?: string;
  googleRegion?: string;
  pinterestCountry?: string;
  metaStatus?: "ACTIVE" | "ALL";
}): Record<string, unknown> {
  const platformsSorted = ALL_ADS_API_PLATFORMS.filter((p) => params.adsPlatforms.includes(p));
  const googleRegionNorm = normalizeGoogleAdsRegion(params.googleRegion ?? DEFAULT_GOOGLE_ADS_REGION);
  const googleResultsLimitNorm = normalizeGoogleAdsResultsLimit(GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT);
  const tiktokRegion = normalizeTikTokAdsRegion(params.tiktokRegion ?? DEFAULT_TIKTOK_ADS_REGION);
  const pinterestCountry = normalizePinterestAdsCountry(params.pinterestCountry);
  const scrapeFields = params.scrapeFields;

  return {
    brand: normalizedBrandForAdsLibraryPayload({
      name: params.brand.name,
      domain: params.brand.domain,
      logoUrl: params.brand.logoUrl,
    }),
    ids: params.ids ?? {},
    metaStatus: params.metaStatus === "ALL" ? ("ALL" as const) : ("ACTIVE" as const),
    googleGetAdDetails: readGoogleAdDetailsPublicFlag(),
    platforms: platformsSorted,
    ...(platformsSorted.includes("tiktok") ? { tiktokRegion } : {}),
    ...(platformsSorted.includes("google")
      ? { googleRegion: googleRegionNorm, googleResultsLimit: googleResultsLimitNorm }
      : {}),
    ...(platformsSorted.includes("pinterest") ? { pinterestCountry } : {}),
    metaMaxAds: scrapeFields.metaMaxAds,
    metaCountry: scrapeFields.metaCountry.trim().toUpperCase() || "US",
    metaStartDate: scrapeFields.metaStartDate.trim(),
    metaEndDate: scrapeFields.metaEndDate.trim(),
    metaSortBy: scrapeFields.metaSortBy.trim() || "impressions_desc",
    linkedinMaxAds: scrapeFields.linkedinMaxAds,
    linkedinDateRange: scrapeFields.linkedinDateRange.trim(),
    linkedinCountryCode: scrapeFields.linkedinCountryCode.trim(),
    tiktokMaxAds: scrapeFields.tiktokMaxAds,
    tiktokStartDate: scrapeFields.tiktokStartDate.trim(),
    tiktokEndDate: scrapeFields.tiktokEndDate.trim(),
    microsoftMaxSearchResults: scrapeFields.microsoftMaxSearchResults,
    microsoftCountryCode: scrapeFields.microsoftCountryCode.trim().replace(/\D/g, "") || "66",
    microsoftStartDate: scrapeFields.microsoftStartDate.trim(),
    microsoftEndDate: scrapeFields.microsoftEndDate.trim(),
    pinterestMaxResults: scrapeFields.pinterestMaxResults,
    pinterestStartDate: scrapeFields.pinterestStartDate.trim(),
    pinterestEndDate: scrapeFields.pinterestEndDate.trim(),
    pinterestGender: scrapeFields.pinterestGender.trim(),
    pinterestAge: scrapeFields.pinterestAge.trim(),
    ...(platformsSorted.includes("snapchat")
      ? {
          snapchatMaxItems: scrapeFields.snapchatMaxItems,
          snapchatCountry: scrapeFields.snapchatCountry.trim().toUpperCase(),
          snapchatStartDate: scrapeFields.snapchatStartDate.trim(),
          snapchatEndDate: scrapeFields.snapchatEndDate.trim(),
        }
      : {}),
  };
}

export function normalizeAdsLibraryEventDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0] ?? "";
}
