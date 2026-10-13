import { runApifyActor } from "@/lib/apify/client";
import { readFacebookAdsMemoryMbytes } from "@/lib/apify/memory";
import { facebookItemToMetaCard, type MetaAdCard } from "@/lib/ad-library/normalize";
import {
  ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
  ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM,
} from "@/lib/ad-library/constants";
import { advertiserNameMatchesBrand, brandMatchCandidates, domainBrandLabel } from "@/lib/ad-library/advertiser-name-match";
import { inferIso2FromCompetitorDomain } from "@/lib/ad-library/infer-ad-library-regions-from-domain";
import { isMetaKeywordSearchUrl } from "@/lib/ad-library/meta-keyword-search-url";
import {
  alignMetaLibraryUrlActiveStatus,
  buildMetaAdLibraryUrl,
  buildWorkspaceBrandActiveMetaAdLibraryUrl,
  extractMetaAdsLibraryPageId,
} from "@/lib/ad-library/canonical-library-url";

const DEFAULT_FACEBOOK_ADS_ACTOR = "curious_coder/facebook-ads-library-scraper";
/** Same ads and raw Meta item shape as curious_coder at ~1/3 the price, but no EU (DSA) reach or targeting. */
const JMLP_META_ADS_ACTOR = "jmlp/meta-ad-library-scraper";
/** jmlp bills Apify compute on top of its per-ad fee, so it runs well below its 4GB default. */
const JMLP_MEMORY_MBYTES = 1024;
const DEFAULT_MAX_ADS = ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM;
const ACTOR_MINIMUM_COUNT = 10;
const MAX_ACTOR_TIMEOUT_SECS = 300;

/** EU + EEA markets, where Meta publishes the per-ad reach and targeting that only curious_coder returns. */
const EU_EEA_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV",
  "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
]);

export type MetaAdsActor = "curious" | "jmlp";

/**
 * `META_ACTOR_MODE`: `by-market` (default) sends EU/EEA scrapes to curious_coder, which keeps EU reach and
 * targeting, and every other market to jmlp; `curious` or `jmlp` forces one actor everywhere.
 * Scheduled scrapes search all countries, so for `ALL` the competitor's domain decides: an EU/EEA country
 * domain or `.eu` stays on curious_coder, anything else (`.com`, `.uk`, …) goes to jmlp.
 */
export function resolveMetaAdsActor(
  country: string,
  brandDomain?: string | null,
  mode = process.env.META_ACTOR_MODE,
): MetaAdsActor {
  const m = mode?.trim().toLowerCase();
  if (m === "curious" || m === "jmlp") return m;
  const c = country.trim().toUpperCase();
  if (c !== "ALL") return EU_EEA_COUNTRIES.has(c) ? "curious" : "jmlp";
  const domainCountry = inferIso2FromCompetitorDomain(brandDomain);
  const euDomain =
    (domainCountry != null && EU_EEA_COUNTRIES.has(domainCountry)) ||
    /\.eu\.?$/i.test(brandDomain?.trim().split("/")[0] ?? "");
  return euDomain ? "curious" : "jmlp";
}

/**
 * jmlp reads its filters from each Ad Library URL. Page URLs are built with `country=ALL` (curious_coder
 * narrows them with `scrapePageAds.countryCode`), so the scrape country is written into those; keyword
 * and pasted search URLs keep their own filters, dates included.
 */
export function buildJmlpMetaAdsInput(params: {
  urls: string[];
  maxAds: number;
  activeStatus: "ACTIVE" | "ALL";
  country: string;
}): Record<string, unknown> {
  return {
    adLibraryUrls: params.urls.map((url) => withPageUrlCountry(url, params.country)),
    maxAds: params.maxAds,
    activeStatus: params.activeStatus === "ALL" ? "all" : "active",
    country: params.country,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
  };
}

function withPageUrlCountry(url: string, country: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("view_all_page_id")) return url;
    u.searchParams.set("country", country);
    return u.toString();
  } catch {
    return url;
  }
}

function isFacebookPageUrl(value: string): boolean {
  return /(?:facebook|fb)\.com\//i.test(value);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Every value the actor's `scrapePageAds.period` accepts; anything else fails the run as invalid input. */
const SCRAPE_PAGE_ADS_PERIODS = new Set(["", "last24h", "last7d", "last14d", "last30d"]);

/**
 * Apify `scrapePageAds.period`. The actor rejects ISO date ranges, so start/end dates never become a
 * period — keyword searches carry them in the Ad Library URL (`start_date[min]` / `[max]`) instead.
 */
export function resolveScrapePageAdsPeriod(params: {
  metaWorkspaceBrandInitialScrape?: boolean;
  scrapePageAdsPeriod?: string;
}): string {
  if (params.metaWorkspaceBrandInitialScrape === true) return "";
  const explicit = params.scrapePageAdsPeriod?.trim() ?? "";
  return SCRAPE_PAGE_ADS_PERIODS.has(explicit) ? explicit : "";
}

function buildKeywordSearchUrl(
  query: string,
  activeStatus: "ACTIVE" | "ALL",
  country: string,
  startDateIso?: string,
  endDateIso?: string
): string {
  const c = country.trim().toUpperCase() || "US";
  const params = new URLSearchParams({
    active_status: activeStatus.toLowerCase(),
    ad_type: "all",
    country: c === "ALL" ? "ALL" : c,
    q: query,
    search_type: "keyword_unordered",
  });
  const s = startDateIso?.trim();
  const e = endDateIso?.trim();
  if (s && ISO_DATE.test(s)) params.set("start_date[min]", s);
  if (e && ISO_DATE.test(e)) params.set("start_date[max]", e);
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

function normalizeFacebookHref(raw: string): string {
  const t = raw.trim();
  return t.startsWith("http") ? t : `https://${t}`;
}

function buildInputUrls(
  ids: { meta?: string; metaPageUrl?: string },
  brandName: string,
  activeStatus: "ACTIVE" | "ALL",
  country: string,
  startDateIso?: string,
  endDateIso?: string,
  metaWorkspaceBrandInitialScrape?: boolean,
): Array<{ url: string }> {
  const urls = new Set<string>();

  if (metaWorkspaceBrandInitialScrape) {
    const pageId =
      extractMetaAdsLibraryPageId(ids.metaPageUrl ?? "") ??
      extractMetaAdsLibraryPageId(ids.meta ?? "");
    if (pageId) {
      urls.add(buildWorkspaceBrandActiveMetaAdLibraryUrl(pageId));
      return [...urls].map((url) => ({ url }));
    }
  }

  const pageRaw = ids.metaPageUrl?.trim();
  const metaRaw = ids.meta?.trim();
  const pageHref = pageRaw ? normalizeFacebookHref(pageRaw) : "";
  const metaHref = metaRaw ? normalizeFacebookHref(metaRaw) : "";

  /** When both `meta` and `metaPageUrl` are Ad Library links (e.g. stale id vs user paste), Apify must not scrape two URLs — `metaPageUrl` wins. */
  if (pageHref && isFacebookPageUrl(pageHref) && /ads\/library/i.test(pageHref)) {
    urls.add(pageHref);
  } else {
    if (pageHref && isFacebookPageUrl(pageHref)) urls.add(pageHref);
    if (metaHref && isFacebookPageUrl(metaHref)) {
      urls.add(metaHref);
    } else if (metaRaw) {
      const digits = metaRaw.replace(/\D/g, "");
      if (
        digits.length >= 10 &&
        digits.length <= 22 &&
        /^[\d\s-]+$/.test(metaRaw.replace(/[^\d\s-]/g, ""))
      ) {
        urls.add(
          activeStatus === "ACTIVE"
            ? buildWorkspaceBrandActiveMetaAdLibraryUrl(digits)
            : buildMetaAdLibraryUrl(digits),
        );
      }
    }
  }

  const keyword = brandName.trim();
  if (keyword && urls.size === 0) {
    urls.add(buildKeywordSearchUrl(keyword, activeStatus, country, startDateIso, endDateIso));
  }

  return [...urls].map((url) => ({
    url: alignMetaLibraryUrlActiveStatus(url, activeStatus),
  }));
}

export async function scrapeFacebookAds(
  params: {
    ids: { meta?: string; metaPageUrl?: string };
    brandName: string;
    /** Competitor domain — a brand-name fallback when keyword-search results are filtered by page name. */
    brandDomain?: string;
    activeStatus?: "ACTIVE" | "ALL";
    maxAds?: number;
    /** ISO 3166-1 alpha-2 or `ALL` */
    countryCode?: string;
    metaStartDate?: string;
    metaEndDate?: string;
    /** Actor `scrapePageAds.period` preset (`last24h`, `last7d`, …); empty when omitted or not a preset. */
    scrapePageAdsPeriod?: string;
    /** Actor `scrapePageAds.sortBy` */
    scrapePageAdsSortBy?: string;
    /** Post-onboarding workspace brand scrape — use full active page Ad Library URL. */
    metaWorkspaceBrandInitialScrape?: boolean;
  }
): Promise<MetaAdCard[]> {
  /** Overrides the curious_coder-format actor only; jmlp takes a different input. */
  const actorId = process.env.APIFY_FACEBOOK_ADS_ACTOR?.trim() || DEFAULT_FACEBOOK_ADS_ACTOR;
  const workspaceBrandInitial = params.metaWorkspaceBrandInitialScrape === true;
  const activeStatus = params.activeStatus === "ALL" ? "ALL" : "ACTIVE";
  const maxAds = Math.max(
    1,
    Math.min(params.maxAds ?? DEFAULT_MAX_ADS, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM)
  );
  const target = metaScrapeTarget(params.ids);
  const country = workspaceBrandInitial
    ? "ALL"
    : (params.countryCode ?? "US").trim().toUpperCase() || "US";
  const sd = params.metaStartDate?.trim();
  const ed = params.metaEndDate?.trim();
  const urls = buildInputUrls(
    params.ids,
    params.brandName,
    activeStatus,
    country,
    sd,
    ed,
    workspaceBrandInitial,
  );

  if (urls.length === 0) {
    throw new Error("No valid Meta search URL or Facebook page URL was provided");
  }

  const keywordSearch = !target.pageId && urls.some(({ url }) => isMetaKeywordSearchUrl(url));
  /** Keyword searches return many advertisers that get filtered out, so ask for more. */
  const wantedCount = keywordSearch ? Math.min(maxAds * 3, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM) : maxAds;

  const cc = country === "ALL" ? "ALL" : country;
  const actor = resolveMetaAdsActor(cc, params.brandDomain);
  // curious_coder refuses counts below 10, so we request 10 and slice the UI
  // result back down to the cheaper user-facing cap.
  const actorCount = actor === "jmlp" ? wantedCount : Math.max(ACTOR_MINIMUM_COUNT, wantedCount);
  const input =
    actor === "jmlp"
      ? buildJmlpMetaAdsInput({ urls: urls.map(({ url }) => url), maxAds: actorCount, activeStatus, country: cc })
      : {
          urls,
          count: actorCount,
          scrapeAdDetails: true,
          "scrapePageAds.countryCode": cc,
          "scrapePageAds.activeStatus": activeStatus === "ALL" ? "all" : "active",
          "scrapePageAds.sortBy": params.scrapePageAdsSortBy ?? "impressions_desc",
          "scrapePageAds.period": resolveScrapePageAdsPeriod({
            metaWorkspaceBrandInitialScrape: workspaceBrandInitial,
            scrapePageAdsPeriod: params.scrapePageAdsPeriod,
          }),
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"],
          },
        };
  const { items } = await runApifyActor<unknown>(
    actor === "jmlp" ? JMLP_META_ADS_ACTOR : actorId,
    input,
    {
      waitSecs: MAX_ACTOR_TIMEOUT_SECS,
      timeoutSecs: MAX_ACTOR_TIMEOUT_SECS,
      // Apify requires maxItems > 0 for pay-per-event / store actors that charge per row
      maxItems: actorCount,
      memoryMbytes: actor === "jmlp" ? JMLP_MEMORY_MBYTES : readFacebookAdsMemoryMbytes(urls.length),
    }
  );

  const cards = items
    .map((item, index) => facebookItemToMetaCard(item, index, target.pageId ? { confirmedPageId: target.pageId } : undefined))
    .filter((item): item is MetaAdCard => item !== null);

  /**
   * Only the competitor's own ads: with a page id, drop rows from other pages; with a keyword search
   * (pasted `?q=` link or the brand-name fallback), keep pages whose name is the brand.
   */
  const candidates = brandMatchCandidates(params.brandName, domainBrandLabel(params.brandDomain));
  const own = target.pageId
    ? cards.filter((c) => !c.advertiserMismatch)
    : keywordSearch
      ? cards.filter((c) => advertiserNameMatchesBrand(c.pageName, candidates))
      : cards;

  return own.slice(0, maxAds);
}

/** The Meta page the saved identifiers point at, if any (Ad Library `view_all_page_id` or a bare page id). */
function metaScrapeTarget(ids: { meta?: string; metaPageUrl?: string }): { pageId?: string } {
  for (const raw of [ids.metaPageUrl, ids.meta]) {
    const t = raw?.trim();
    if (!t) continue;
    const fromUrl = extractMetaAdsLibraryPageId(t);
    if (fromUrl) return { pageId: fromUrl };
    if (/^[\d\s-]+$/.test(t)) {
      const digits = t.replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 22) return { pageId: digits };
    }
  }
  return {};
}
