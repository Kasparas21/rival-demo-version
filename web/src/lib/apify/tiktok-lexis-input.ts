import { effectiveCompetitorBrandLabel } from "@/lib/ad-library/competitor-brand-display";
import { normalizeUserAdvertiserQueryToken } from "@/lib/ad-library/normalize";
import { parseTikTokAdsLibraryUrl } from "@/lib/apify/tiktok-apify-input";

export const LEXIS_TIKTOK_ACTOR = "lexis-solutions/tiktok-ads-scraper";

export function isLexisTikTokActor(actorId: string): boolean {
  return /lexis-solutions\/tiktok-ads-scraper/i.test(actorId.trim());
}

/** Lexis `maxPages` — keep low; `runApifyActor` `maxItems` caps rows returned. */
export function lexisMaxPagesForAdCap(maxAds: number): number {
  return Math.max(1, Math.min(5, Math.ceil(maxAds / 60)));
}

export type LexisTikTokActorInput = {
  advertiserName: string;
  query?: string;
  country: string;
  maxPages: number;
  sortBy: string;
  quickSearch: boolean;
  proxyConfiguration: { useApifyProxy: boolean };
};

export function buildLexisTikTokActorInput(params: {
  brandName: string;
  brandDomain?: string;
  savedTiktok?: string | null;
  region: string;
  maxAds: number;
}): { input: LexisTikTokActorInput; confirmedAdvertiserQuery?: string } {
  const raw = params.savedTiktok?.trim().replace(/^@+/, "") ?? "";
  const searchBrand =
    effectiveCompetitorBrandLabel(params.brandName, params.brandDomain) || params.brandName.trim();

  let advertiserName = "";
  let confirmedAdvertiserQuery: string | undefined;

  if (raw && /^https?:\/\//i.test(raw)) {
    const parsed = parseTikTokAdsLibraryUrl(raw);
    advertiserName =
      parsed.advName?.trim() ||
      normalizeUserAdvertiserQueryToken(searchBrand) ||
      searchBrand ||
      "brand";
  } else if (raw && /^\d{6,}$/.test(raw)) {
    advertiserName = normalizeUserAdvertiserQueryToken(searchBrand) || searchBrand || "brand";
  } else if (raw) {
    advertiserName = normalizeUserAdvertiserQueryToken(raw);
    confirmedAdvertiserQuery = advertiserName;
  } else {
    advertiserName = normalizeUserAdvertiserQueryToken(searchBrand) || searchBrand || "brand";
  }

  const country = params.region.trim().toUpperCase() === "ALL" ? "all" : params.region.trim().toUpperCase();

  const input: LexisTikTokActorInput = {
    advertiserName,
    country,
    maxPages: lexisMaxPagesForAdCap(params.maxAds),
    sortBy: "last_shown_date,desc",
    quickSearch: false,
    proxyConfiguration: { useApifyProxy: true },
  };

  return {
    input,
    ...(confirmedAdvertiserQuery ? { confirmedAdvertiserQuery } : {}),
  };
}
