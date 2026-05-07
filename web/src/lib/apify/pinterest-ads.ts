import { runApifyActor } from "@/lib/apify/client";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";

const DEFAULT_ACTOR = "zadexinho/pinterest-ads-scraper";
const MAX_TIMEOUT_SECS = 600;

/**
 * Pinterest Ad Transparency (DSA regions) via Apify.
 * Partial match on advertiserName; country must be EU-27, BR, or TR per actor docs.
 * Callers should pass a single resolved `advertiserName` (e.g. profile handle from URL).
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function scrapePinterestAdsLibrary(params: {
  /** Single search string for the actor (handle from profile URL or brand name). */
  advertiserName: string;
  maxResults: number;
  /** ISO 3166-1 alpha-2 (e.g. DE, FR, BR) */
  country: string;
  startDate?: string;
  endDate?: string;
  gender?: string;
  age?: string;
}): Promise<Record<string, unknown>[]> {
  const actorId = process.env.APIFY_PINTEREST_ADS_ACTOR?.trim() || DEFAULT_ACTOR;
  const maxResults = Math.max(
    1,
    Math.min(params.maxResults, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM, 1000)
  );
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  let startDate = start.toISOString().slice(0, 10);
  let endDate = end.toISOString().slice(0, 10);
  if (params.startDate?.trim() && ISO_DATE.test(params.startDate.trim())) {
    startDate = params.startDate.trim();
  }
  if (params.endDate?.trim() && ISO_DATE.test(params.endDate.trim())) {
    endDate = params.endDate.trim();
  }
  if (startDate > endDate) [startDate, endDate] = [endDate, startDate];

  const category = process.env.PINTEREST_ADS_CATEGORY?.trim() || "ALL";
  const gender =
    params.gender?.trim() || process.env.PINTEREST_ADS_GENDER?.trim() || "ALL";
  const age = params.age?.trim() || process.env.PINTEREST_ADS_AGE?.trim() || "ALL";

  const advertiserName = params.advertiserName.trim() || "marketing";

  const base: Record<string, unknown> = {
    country: params.country,
    maxResults,
    startDate,
    endDate,
    category,
    gender,
    age,
    advertiserName,
  };

  if (process.env.PINTEREST_ADS_PROXY !== "false") {
    base.proxyConfiguration = {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    };
  }

  const { items } = await runApifyActor<Record<string, unknown>>(actorId, base, {
    waitSecs: MAX_TIMEOUT_SECS,
    timeoutSecs: MAX_TIMEOUT_SECS,
    maxItems: maxResults,
  });
  return items;
}
