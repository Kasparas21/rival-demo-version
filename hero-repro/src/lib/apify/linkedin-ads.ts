import { runApifyActor } from "@/lib/apify/client";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";
import type { LinkedInAdItem } from "@/lib/ad-library/apify-raw-types";
import { linkedInApifyItemToLegacyItem } from "@/lib/ad-library/normalize";

const DEFAULT_LINKEDIN_ACTOR = "automation-lab/linkedin-ad-library-scraper";
const MAX_TIMEOUT_SECS = 600;

function normalizeHttpUrl(s: string): string {
  const t = s.trim();
  return t.startsWith("http") ? t : `https://${t}`;
}

function linkedInKeywordSeed(brandName: string, keywordFallback?: string): string {
  const raw = brandName.trim();
  const brand = raw || "marketing";
  const fb = keywordFallback?.trim();
  if (!fb) return brand;
  if (!raw || /^(admin|owner|user|test|competitor)$/i.test(raw)) return fb;
  return brand;
}

/**
 * automation-lab/linkedin-ad-library-scraper: requires `searchQuery` or `advertiserUrls`.
 */
const LINKEDIN_DATE_RANGES = new Set([
  "all-time",
  "past-day",
  "past-week",
  "past-month",
  "past-year",
]);

function buildLinkedInActorInput(params: {
  brandName: string;
  linkedinUrl?: string;
  keywordFallback?: string;
  maxAds: number;
  dateRange?: string;
  countryCode?: string;
}): Record<string, unknown> {
  const maxAds = Math.max(1, Math.min(params.maxAds, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
  const dr = params.dateRange?.trim();
  const dateRange =
    dr && LINKEDIN_DATE_RANGES.has(dr) ? dr : "past-year";
  const base: Record<string, unknown> = {
    maxAds,
    dateRange,
    sortBy: "RECENT",
  };
  const cc = params.countryCode?.trim();
  if (cc) {
    base.countryCode = cc.length === 2 ? cc.toUpperCase() : cc;
  }

  const li = params.linkedinUrl?.trim();
  const searchSeed = linkedInKeywordSeed(params.brandName, params.keywordFallback);

  if (li) {
    const full = normalizeHttpUrl(li);
    if (/linkedin\.com\/company\//i.test(full)) {
      return { ...base, advertiserUrls: [full] };
    }
    const kw = full.match(/[?&]keyword=([^&]+)/i)?.[1];
    if (kw) {
      return {
        ...base,
        searchQuery: decodeURIComponent(kw.replace(/\+/g, " ")),
      };
    }
    if (/linkedin\.com\/ad-library\//i.test(full)) {
      return { ...base, searchQuery: searchSeed };
    }
  }

  return { ...base, searchQuery: searchSeed };
}

export async function scrapeLinkedInAdLibrary(params: {
  brandName: string;
  linkedinUrl?: string;
  keywordFallback?: string;
  maxItems: number;
  dateRange?: string;
  countryCode?: string;
}): Promise<LinkedInAdItem[]> {
  const actorId =
    process.env.APIFY_LINKEDIN_ADS_ACTOR?.trim() || DEFAULT_LINKEDIN_ACTOR;
  const maxAds = Math.max(1, Math.min(params.maxItems, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
  const input = buildLinkedInActorInput({
    brandName: params.brandName,
    linkedinUrl: params.linkedinUrl,
    keywordFallback: params.keywordFallback,
    maxAds,
    dateRange: params.dateRange,
    countryCode: params.countryCode,
  });

  const { items } = await runApifyActor<Record<string, unknown>>(
    actorId,
    input,
    {
      waitSecs: MAX_TIMEOUT_SECS,
      timeoutSecs: MAX_TIMEOUT_SECS,
      maxItems: maxAds,
      memoryMbytes: 256,
    }
  );

  return items.map((raw, i) => linkedInApifyItemToLegacyItem(raw, i));
}
