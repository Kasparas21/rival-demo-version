import { runApifyActor } from "@/lib/apify/client";
import { APIFY_LIGHT_ACTOR_MEMORY_MBYTES, readApifyActorMemoryMbytes } from "@/lib/apify/memory";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { canonicalLinkedInAdLibraryUrl } from "@/lib/ad-library/canonical-library-url";
import type { LinkedInAdItem } from "@/lib/ad-library/apify-raw-types";
import { linkedInApifyItemToLegacyItem } from "@/lib/ad-library/normalize";

const DEFAULT_LINKEDIN_ACTOR = "data_xplorer/linkedin-ad-library-scraper";
const MAX_TIMEOUT_SECS = 600;

function normalizeHttpUrl(s: string): string {
  const t = s.trim();
  return t.startsWith("http") ? t : `https://${t}`;
}

/** Prefer domain label when display name is a useless default (fixes workspace user name as brand). */
function linkedInKeywordSeed(brandName: string, keywordFallback?: string): string {
  const raw = brandName.trim();
  const brand = raw || "marketing";
  const fb = keywordFallback?.trim();
  if (!fb) return brand;
  if (!raw || /^(admin|owner|user|test|competitor)$/i.test(raw)) return fb;
  return brand;
}

function usesIvanVsLinkedInActor(actorId: string): boolean {
  return actorId.includes("ivanvs/linkedin-ad-library-scraper");
}

function usesDataXplorerLinkedInActor(actorId: string): boolean {
  return actorId.includes("data_xplorer/linkedin-ad-library-scraper");
}

/**
 * data_xplorer/linkedin-ad-library-scraper — `searchUrl` + `maxItems` + proxy.
 * @see https://apify.com/data_xplorer/linkedin-ad-library-scraper
 */
function buildDataXplorerLinkedInInput(params: {
  brandName: string;
  linkedinUrl?: string;
  keywordFallback?: string;
  maxAds: number;
  dateRange?: string;
  countryCode?: string;
  decodeUrls?: boolean;
}): Record<string, unknown> {
  const maxItems = Math.max(1, Math.min(params.maxAds, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
  const searchUrl = buildLinkedInAdLibraryRequestUrl({
    brandName: params.brandName,
    linkedinUrl: params.linkedinUrl,
    keywordFallback: params.keywordFallback,
    dateRange: params.dateRange,
    countryCode: params.countryCode,
  });
  return {
    searchUrl,
    maxItems,
    decodeUrls: params.decodeUrls ?? false,
    proxyConfiguration: {
      useApifyProxy: true,
    },
  };
}

/**
 * ivanvs/linkedin-ad-library-scraper — pass Ad Library search (or detail) URLs.
 * @see https://apify.com/ivanvs/linkedin-ad-library-scraper
 */
function buildIvanVsLinkedInInput(params: {
  brandName: string;
  linkedinUrl?: string;
  keywordFallback?: string;
  maxAds: number;
  dateRange?: string;
  countryCode?: string;
}): Record<string, unknown> {
  const maxResults = Math.max(1, Math.min(params.maxAds, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
  const url = buildLinkedInAdLibraryRequestUrl({
    brandName: params.brandName,
    linkedinUrl: params.linkedinUrl,
    keywordFallback: params.keywordFallback,
    dateRange: params.dateRange,
    countryCode: params.countryCode,
  });
  return {
    urls: [{ url, method: "GET" }],
    maxResults,
  };
}

/**
 * Build a LinkedIn Ad Library URL the actor can scrape (search, or a single detail page).
 */
export function buildLinkedInAdLibraryRequestUrl(params: {
  brandName: string;
  linkedinUrl?: string;
  dateRange?: string;
  countryCode?: string;
  /**
   * When no LinkedIn URL is set, keyword search uses this instead of `brandName`
   * (e.g. domain label "Acme" instead of user display name "Admin").
   */
  keywordFallback?: string;
}): string {
  const keywordSeed = linkedInKeywordSeed(params.brandName, params.keywordFallback);
  const liRaw = params.linkedinUrl?.trim();
  const liResolved = liRaw ? canonicalLinkedInAdLibraryUrl(liRaw) ?? liRaw : undefined;
  const li = liResolved?.trim();
  const cc = params.countryCode?.trim();
  const dr = params.dateRange?.trim();

  if (li) {
    const full = normalizeHttpUrl(li);
    if (/linkedin\.com\/ad-library\/detail\//i.test(full)) {
      return full.split("#")[0];
    }
    if (/linkedin\.com\/ad-library\/search\?/i.test(full)) {
      try {
        const u = new URL(full);
        const owner = u.searchParams.get("accountOwner")?.trim();
        if (owner && !u.searchParams.get("keyword")?.trim()) {
          u.searchParams.set("keyword", owner);
        }
        if (cc && cc.length === 2 && !u.searchParams.has("countries")) {
          u.searchParams.set("countries", cc.toUpperCase());
        }
        applyLinkedInDateOptionParam(u, dr);
        return u.toString();
      } catch {
        return full;
      }
    }
    if (/linkedin\.com\/company\//i.test(full)) {
      const m = full.match(/linkedin\.com\/company\/([^/?#]+)/i);
      const slug = m?.[1] ? decodeURIComponent(m[1].replace(/\/$/, "")) : "";
      const keyword = slug ? slug.replace(/-/g, " ") : keywordSeed;
      const u = new URL("https://www.linkedin.com/ad-library/search");
      u.searchParams.set("keyword", keyword);
      if (cc && cc.length === 2) u.searchParams.set("countries", cc.toUpperCase());
      applyLinkedInDateOptionParam(u, dr);
      return u.toString();
    }
  }

  const u = new URL("https://www.linkedin.com/ad-library/search");
  u.searchParams.set("keyword", keywordSeed);
  if (cc && cc.length === 2) u.searchParams.set("countries", cc.toUpperCase());
  applyLinkedInDateOptionParam(u, dr);
  return u.toString();
}

/** Documented example uses `dateOption=current-year`; only map values we know work in the public UI. */
function applyLinkedInDateOptionParam(u: URL, dateRange: string | undefined): void {
  if (dateRange === "past-year") {
    u.searchParams.set("dateOption", "current-year");
  }
}

/**
 * automation-lab/linkedin-ad-library-scraper: `searchQuery` or `advertiserUrls`.
 * Use only when `APIFY_LINKEDIN_ADS_ACTOR` points at a compatible actor.
 */
const AUTOMATION_LAB_DATE_RANGES = new Set([
  "all-time",
  "past-day",
  "past-week",
  "past-month",
  "past-year",
]);

function buildAutomationLabLinkedInInput(params: {
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
    dr && AUTOMATION_LAB_DATE_RANGES.has(dr) ? dr : "past-year";
  const base: Record<string, unknown> = {
    maxAds,
    dateRange,
    sortBy: "RECENT",
  };
  const cc = params.countryCode?.trim();
  if (cc) {
    base.countryCode = cc.length === 2 ? cc.toUpperCase() : cc;
  }

  const liRaw = params.linkedinUrl?.trim();
  const li = liRaw ? canonicalLinkedInAdLibraryUrl(liRaw) ?? liRaw : undefined;
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
  const input = usesIvanVsLinkedInActor(actorId)
    ? buildIvanVsLinkedInInput({
        brandName: params.brandName,
        linkedinUrl: params.linkedinUrl,
        keywordFallback: params.keywordFallback,
        maxAds,
        dateRange: params.dateRange,
        countryCode: params.countryCode,
      })
    : usesDataXplorerLinkedInActor(actorId)
      ? buildDataXplorerLinkedInInput({
          brandName: params.brandName,
          linkedinUrl: params.linkedinUrl,
          keywordFallback: params.keywordFallback,
          maxAds,
          dateRange: params.dateRange,
          countryCode: params.countryCode,
          decodeUrls: process.env.APIFY_LINKEDIN_DECODE_URLS?.trim() === "1",
        })
      : buildAutomationLabLinkedInInput({
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
      memoryMbytes: readApifyActorMemoryMbytes("LINKEDIN_ADS_MEMORY_MBYTES", APIFY_LIGHT_ACTOR_MEMORY_MBYTES),
    }
  );

  return items.map((raw, i) => linkedInApifyItemToLegacyItem(raw, i));
}
