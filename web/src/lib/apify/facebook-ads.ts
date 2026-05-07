import { runApifyActor } from "@/lib/apify/client";
import { facebookItemToMetaCard, type MetaAdCard } from "@/lib/ad-library/normalize";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";

const DEFAULT_FACEBOOK_ADS_ACTOR = "curious_coder/facebook-ads-library-scraper";
const DEFAULT_MAX_ADS = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;
const ACTOR_MINIMUM_COUNT = 10;
const MAX_ACTOR_TIMEOUT_SECS = 300;

function isFacebookPageUrl(value: string): boolean {
  return /(?:facebook|fb)\.com\//i.test(value);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

function buildInputUrls(
  ids: { meta?: string; metaPageUrl?: string },
  brandName: string,
  activeStatus: "ACTIVE" | "ALL",
  country: string,
  startDateIso?: string,
  endDateIso?: string
): Array<{ url: string }> {
  const urls = new Set<string>();
  const metaPageUrl = ids.metaPageUrl?.trim();
  const meta = ids.meta?.trim();

  if (metaPageUrl && isFacebookPageUrl(metaPageUrl)) {
    urls.add(metaPageUrl.startsWith("http") ? metaPageUrl : `https://${metaPageUrl}`);
  }

  if (meta && isFacebookPageUrl(meta)) {
    urls.add(meta.startsWith("http") ? meta : `https://${meta}`);
  }

  const keyword = brandName.trim();
  if (keyword) {
    urls.add(buildKeywordSearchUrl(keyword, activeStatus, country, startDateIso, endDateIso));
  }

  return [...urls].map((url) => ({ url }));
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
  }
): Promise<MetaAdCard[]> {
  const actorId = process.env.APIFY_FACEBOOK_ADS_ACTOR?.trim() || DEFAULT_FACEBOOK_ADS_ACTOR;
  const activeStatus = params.activeStatus === "ALL" ? "ALL" : "ACTIVE";
  const maxAds = Math.max(1, Math.min(params.maxAds ?? DEFAULT_MAX_ADS, DEFAULT_MAX_ADS));
  const actorCount = Math.max(ACTOR_MINIMUM_COUNT, maxAds);
  const country = (params.countryCode ?? "US").trim().toUpperCase() || "US";
  const sd = params.metaStartDate?.trim();
  const ed = params.metaEndDate?.trim();
  const urls = buildInputUrls(params.ids, params.brandName, activeStatus, country, sd, ed);

  if (urls.length === 0) {
    throw new Error("No valid Meta search URL or Facebook page URL was provided");
  }

  const cc = country === "ALL" ? "ALL" : country;
  const period =
    params.scrapePageAdsPeriod ??
    (sd && ed && ISO_DATE.test(sd) && ISO_DATE.test(ed) ? `${sd}_${ed}` : "");
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
    }
  );

  return items
    .slice(0, maxAds)
    .map((item, index) => facebookItemToMetaCard(item, index))
    .filter((item): item is MetaAdCard => item !== null);
}
