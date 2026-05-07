import { runApifyActor } from "@/lib/apify/client";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";

const DEFAULT_ACTOR = "codebyte/microsoft-ads-library";
const MAX_TIMEOUT_SECS = 600;

/**
 * Per-ad detail fetches (slower / more Apify usage) can surface extra fields; the bulk
 * Microsoft Ads Library search response is mostly copy + URLs — images are often absent.
 * Set `MICROSOFT_ADS_INCLUDE_DETAILS=false` to skip detail calls and save credits.
 */
function readIncludeAdDetails(): boolean {
  return process.env.MICROSOFT_ADS_INCLUDE_DETAILS !== "false";
}

function readCountryCodes(): string[] {
  const raw = process.env.MICROSOFT_ADS_COUNTRY_CODES?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        return parsed as string[];
      }
    } catch {
      /* fall through */
    }
  }
  return ["66"];
}

/**
 * Microsoft Advertising Transparency (EEA) via Apify.
 * Single `runApifyActor` per request: `searchAds` by advertiser id (override) or by keyword text.
 * We intentionally do not call `searchAdvertisers` first — that doubled Apify usage without user benefit.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function scrapeMicrosoftAdsLibrary(params: {
  brandName: string;
  maxSearchResults: number;
  /** Manual numeric advertiser ID — one `searchAds` run by advertiser id instead of keyword. */
  advertiserIdOverride?: string;
  /** EEA / library numeric codes as strings, e.g. `["66"]` */
  countryCodes?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<Record<string, unknown>[]> {
  const actorId = process.env.APIFY_MICROSOFT_ADS_ACTOR?.trim() || DEFAULT_ACTOR;
  const q = params.brandName.trim() || "marketing";
  const maxSearchResults = Math.max(
    24,
    Math.min(params.maxSearchResults, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM, 1000)
  );
  const countryCodes =
    params.countryCodes && params.countryCodes.length > 0
      ? params.countryCodes
      : readCountryCodes();
  const includeAdDetails = readIncludeAdDetails();

  const opts = {
    waitSecs: MAX_TIMEOUT_SECS,
    timeoutSecs: MAX_TIMEOUT_SECS,
    maxItems: maxSearchResults,
  };

  const sd =
    params.startDate?.trim() && ISO_DATE.test(params.startDate.trim())
      ? params.startDate.trim()
      : undefined;
  const ed =
    params.endDate?.trim() && ISO_DATE.test(params.endDate.trim())
      ? params.endDate.trim()
      : undefined;

  const baseSearch: Record<string, unknown> = {
    maxSearchResults,
    countryCodes,
    includeAdDetails,
  };
  if (sd) baseSearch.startDate = sd;
  if (ed) baseSearch.endDate = ed;

  const overrideRaw = params.advertiserIdOverride?.trim().replace(/\D/g, "");
  if (overrideRaw) {
    const oid = parseInt(overrideRaw, 10);
    if (Number.isFinite(oid)) {
      const { items } = await runApifyActor<Record<string, unknown>>(
        actorId,
        {
          mode: "searchAds",
          advertiserId: oid,
          ...baseSearch,
        },
        opts
      );
      return items;
    }
  }

  const { items } = await runApifyActor<Record<string, unknown>>(
    actorId,
    {
      mode: "searchAds",
      searchAdText: q,
      ...baseSearch,
    },
    opts
  );
  return items;
}
