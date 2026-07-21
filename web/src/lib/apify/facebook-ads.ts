import { runApifyActor } from "@/lib/apify/client";
import { readFacebookAdsMemoryMbytes } from "@/lib/apify/memory";
import { facebookItemToMetaCard, type MetaAdCard } from "@/lib/ad-library/normalize";
import {
  ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
  ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM,
} from "@/lib/ad-library/constants";
import {
  alignMetaLibraryUrlActiveStatus,
  buildMetaAdLibraryUrl,
  buildWorkspaceBrandActiveMetaAdLibraryUrl,
  extractMetaAdsLibraryPageId,
} from "@/lib/ad-library/canonical-library-url";

const DEFAULT_FACEBOOK_ADS_ACTOR = "curious_coder/facebook-ads-library-scraper";
const DEFAULT_MAX_ADS = ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM;
const ACTOR_MINIMUM_COUNT = 10;
const MAX_ACTOR_TIMEOUT_SECS = 300;

function isFacebookPageUrl(value: string): boolean {
  return /(?:facebook|fb)\.com\//i.test(value);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Apify `scrapePageAds.period` — workspace page URL already scopes active ads; never send ISO date ranges. */
export function resolveScrapePageAdsPeriod(params: {
  metaWorkspaceBrandInitialScrape?: boolean;
  scrapePageAdsPeriod?: string;
  metaStartDate?: string;
  metaEndDate?: string;
}): string {
  if (params.metaWorkspaceBrandInitialScrape === true) return "";
  const explicit = params.scrapePageAdsPeriod?.trim();
  if (explicit != null && explicit !== "") return explicit;
  const sd = params.metaStartDate?.trim();
  const ed = params.metaEndDate?.trim();
  if (sd && ed && ISO_DATE.test(sd) && ISO_DATE.test(ed)) return `${sd}_${ed}`;
  return "";
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

  if (metaWorkspaceBrandInitialScrape && activeStatus === "ACTIVE") {
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
    activeStatus?: "ACTIVE" | "ALL";
    maxAds?: number;
    /** ISO 3166-1 alpha-2 or `ALL` */
    countryCode?: string;
    metaStartDate?: string;
    metaEndDate?: string;
    /** Actor `scrapePageAds.period` — derived from dates when set, else empty. */
    scrapePageAdsPeriod?: string;
    /** Actor `scrapePageAds.sortBy` */
    scrapePageAdsSortBy?: string;
    /** Post-onboarding workspace brand scrape — use full active page Ad Library URL. */
    metaWorkspaceBrandInitialScrape?: boolean;
  }
): Promise<MetaAdCard[]> {
  const actorId = process.env.APIFY_FACEBOOK_ADS_ACTOR?.trim() || DEFAULT_FACEBOOK_ADS_ACTOR;
  const workspaceBrandInitial = params.metaWorkspaceBrandInitialScrape === true;
  const activeStatus = params.activeStatus === "ALL" ? "ALL" : "ACTIVE";
  const maxAds = Math.max(
    1,
    Math.min(params.maxAds ?? DEFAULT_MAX_ADS, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM)
  );
  const actorCount = Math.max(ACTOR_MINIMUM_COUNT, maxAds);
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

  const cc = country === "ALL" ? "ALL" : country;
  const period = resolveScrapePageAdsPeriod({
    metaWorkspaceBrandInitialScrape: workspaceBrandInitial,
    scrapePageAdsPeriod: params.scrapePageAdsPeriod,
    metaStartDate: sd,
    metaEndDate: ed,
  });
  const { items } = await runApifyActor<unknown>(
    actorId,
    {
      urls,
      // This actor refuses values below 10, so we request 10 and slice the UI
      // result back down to the cheaper user-facing cap.
      count: actorCount,
      scrapeAdDetails: true,
      "scrapePageAds.countryCode": cc,
      "scrapePageAds.activeStatus": activeStatus === "ALL" ? "all" : "active",
      "scrapePageAds.sortBy": params.scrapePageAdsSortBy ?? "impressions_desc",
      "scrapePageAds.period": period,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    },
    {
      waitSecs: MAX_ACTOR_TIMEOUT_SECS,
      timeoutSecs: MAX_ACTOR_TIMEOUT_SECS,
      // Apify requires maxItems > 0 for pay-per-event / store actors that charge per row
      maxItems: actorCount,
      memoryMbytes: readFacebookAdsMemoryMbytes(urls.length),
    }
  );

  return items
    .slice(0, maxAds)
    .map((item, index) => facebookItemToMetaCard(item, index))
    .filter((item): item is MetaAdCard => item !== null);
}
