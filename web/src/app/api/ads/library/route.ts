import { NextResponse } from "next/server";
import { CACHEABLE_PLATFORMS, type CacheablePlatform } from "@/lib/ad-library/cache-ttl";
import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import {
  ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
  ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM,
} from "@/lib/ad-library/constants";
import { estimateAdsForPlatforms } from "@/lib/billing/estimate-scrape-ads";
import { filterGoogleRowsActiveToday } from "@/lib/ad-library/google-active-today-filter";
import {
  billingRequiredResponseBody,
  featureNotAvailableResponseBody,
  freeTrialScrapeUsedResponseBody,
  getBillingEntitlement,
  quotaExceededResponseBody,
} from "@/lib/billing/entitlements";
import { checkFreeTrialScrapeAllowedForUser } from "@/lib/billing/usage-quotas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import { microsoftMarketCodeToArray } from "@/lib/ad-library/scrape-settings-options";
import { normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import { countLibraryAdsForPlatform, platformScrapeSucceeded } from "@/lib/ad-library/persist-scraped-ads";
import { recomputeStrategyOverviewForCompetitor } from "@/lib/strategy-overview/recompute-strategy-overview";
import { syncSavedCompetitorLibraryContext } from "@/lib/ad-library/sync-saved-competitor-context";
import { hostToBrandLabel } from "@/lib/onboarding/host";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import type { AdsLibraryIds } from "@/lib/ad-library/run-ads-library-parallel-scrape";
import { runAdsLibraryParallelScrape } from "@/lib/ad-library/run-ads-library-parallel-scrape";
import { finalizeAdsLibraryAfterFreshScrape } from "@/lib/ad-library/finalize-ads-library-scrape";

export const runtime = "nodejs";
/** Request ceiling; effective wall time is min(this, Vercel plan — Hobby ~10s). Ads library + strategy recompute side effects may need Pro+ or a queue. */
export const maxDuration = 300;

const MAX_ADS = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;
const DEFAULT_ADS = ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM;

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || d;
}

function isCacheablePlatform(p: AdsLibraryPlatform): p is CacheablePlatform {
  return (CACHEABLE_PLATFORMS as readonly string[]).includes(p);
}

type AdsCachePickRow = {
  platform: string;
  ads_data: unknown;
  competitor_domain: string;
  scraped_at: string;
  expires_at?: string | null;
};

function rowExpiresStillValid(expiresAt: string | null | undefined, nowIso: string): boolean {
  if (expiresAt == null || String(expiresAt).trim() === "") return false;
  const ex = Date.parse(String(expiresAt));
  const now = Date.parse(nowIso);
  if (Number.isNaN(ex) || Number.isNaN(now)) return false;
  return ex > now;
}

/**
 * `readDomains` can return multiple DB keys (slug vs registrable domain). Without ordering, PostgREST may
 * return two rows per platform; the last iterated row used to win arbitrarily (sometimes an empty stale row).
 * Prefers cache rows whose `expires_at` is still in the future; otherwise falls back to latest `scraped_at`
 * so expired-but-present snapshots still hydrate the UI without forcing Apify.
 */
function pickBestAdsCacheHitsByPlatform(
  rows: AdsCachePickRow[],
  preferredDomain: string,
  nowIso: string
): Map<CacheablePlatform, unknown> {
  const pref = preferredDomain.trim().toLowerCase();
  const bestRow = new Map<CacheablePlatform, AdsCachePickRow>();
  for (const row of rows) {
    const pl = row.platform;
    if (!pl || !isCacheablePlatform(pl as AdsLibraryPlatform)) continue;
    const cp = pl as CacheablePlatform;
    const prev = bestRow.get(cp);
    if (!prev) {
      bestRow.set(cp, row);
      continue;
    }
    const rDom = String(row.competitor_domain ?? "")
      .trim()
      .toLowerCase();
    const pDom = String(prev.competitor_domain ?? "")
      .trim()
      .toLowerCase();
    const rPref = pref.length > 0 && rDom === pref;
    const pPref = pref.length > 0 && pDom === pref;
    if (rPref && !pPref) {
      bestRow.set(cp, row);
      continue;
    }
    if (!rPref && pPref) continue;
    const rFresh = rowExpiresStillValid(row.expires_at ?? null, nowIso);
    const pFresh = rowExpiresStillValid(prev.expires_at ?? null, nowIso);
    if (rFresh && !pFresh) {
      bestRow.set(cp, row);
      continue;
    }
    if (!rFresh && pFresh) continue;
    const rTime = Date.parse(row.scraped_at);
    const pTime = Date.parse(prev.scraped_at);
    if (!Number.isNaN(rTime) && !Number.isNaN(pTime) && rTime > pTime) {
      bestRow.set(cp, row);
    } else if (Number.isNaN(pTime) && !Number.isNaN(rTime)) {
      bestRow.set(cp, row);
    }
  }
  const out = new Map<CacheablePlatform, unknown>();
  for (const [p, r] of bestRow) out.set(p, r.ads_data);
  return out;
}

/**
 * POST /api/ads/library
 * Body: { brand, ids? (pinterest URL + optional pinterestAdvertiserName), metaStatus?, …, pinterestCountry? … }
 * All platforms use Apify (APIFY_TOKEN).
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: {
    brand?: { name?: string; domain?: string };
    ids?: AdsLibraryIds;
    metaStatus?: "ACTIVE" | "ALL";
    metaMaxAds?: number;
    metaCountry?: string;
    metaStartDate?: string;
    metaEndDate?: string;
    metaSortBy?: string;
    linkedinMaxAds?: number;
    linkedinDateRange?: string;
    linkedinCountryCode?: string;
    tiktokMaxAds?: number;
    tiktokStartDate?: string;
    tiktokEndDate?: string;
    microsoftMaxSearchResults?: number;
    /** Single Microsoft Ads Library market code (e.g. `66` = Germany) */
    microsoftCountryCode?: string;
    microsoftStartDate?: string;
    microsoftEndDate?: string;
    pinterestMaxResults?: number;
    pinterestStartDate?: string;
    pinterestEndDate?: string;
    pinterestGender?: string;
    pinterestAge?: string;
    /** Legacy flag; current Google actor (`lurkapi/google-ads-scraper`) has no client-side detail toggle. */
    googleGetAdDetails?: boolean;
    /** TikTok Ads Library actor — must be one of the allowed region codes (default `all`). */
    tiktokRegion?: string;
    /** Google Transparency `region` — `anywhere` or ISO 3166-1 alpha-2 (default `anywhere`). */
    googleRegion?: string;
    /** Google `resultsLimit` (default from `GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT`, max 500). */
    googleResultsLimit?: number;
    /** Pinterest transparency actor — EU-27, BR, or TR (default `DE`). */
    pinterestCountry?: string;
    snapchatMaxItems?: number;
    /** EU ISO2; omit or ALL to sweep all EU markets in the actor (many Apify runs). */
    snapchatCountry?: string;
    snapchatStartDate?: string;
    snapchatEndDate?: string;
    platforms?: AdsLibraryPlatform[];
    /** When true, skip server-side `ads_cache` and run Apify for all requested platforms. */
    skipCache?: boolean;
    /** `discovery` (default) = onboarding/search; `manual` = Pro force-rescrape (gated). */
    intent?: "discovery" | "manual";
    /** When true with manual refresh, post-filter Google rows to ads active today (UTC). */
    filterGoogleActiveToday?: boolean;
    /** When true, only read `ads_cache` — never run Apify (used right after discovery scan). */
    cacheOnly?: boolean;
    /** Channel picker ids — merged into `saved_competitors.ads_library_context`. */
    libraryChannels?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: "Invalid JSON",
        meta: { ads: [], error: "Invalid JSON" },
        google: { rows: [], error: "Invalid JSON" },
        linkedin: { ads: [], error: "Invalid JSON" },
        tiktok: { ads: [], error: "Invalid JSON" },
        microsoft: { ads: [], error: "Invalid JSON" },
        pinterest: { ads: [], error: "Invalid JSON" },
        snapchat: { ads: [], error: "Invalid JSON" },
      },
      { status: 400 }
    );
  }

  const brandName = body.brand?.name?.trim() || "Competitor";
  const domain = cleanDomain(body.brand?.domain || "");
  const linkedinKeywordFallback = domain ? hostToBrandLabel(domain) : undefined;
  const ids: AdsLibraryIds = body.ids ?? {};
  const metaStatus = body.metaStatus === "ALL" ? "ALL" : "ACTIVE";
  let metaMaxAds = Math.max(1, Math.min(body.metaMaxAds ?? DEFAULT_ADS, MAX_ADS));
  const metaCountry = (body.metaCountry ?? "US").trim().toUpperCase() || "US";
  const metaStartDate = body.metaStartDate?.trim();
  const metaEndDate = body.metaEndDate?.trim();
  const metaSortBy = (body.metaSortBy ?? "impressions_desc").trim() || "impressions_desc";
  let linkedinMaxAds = Math.max(1, Math.min(body.linkedinMaxAds ?? DEFAULT_ADS, MAX_ADS));
  const linkedinDateRange = body.linkedinDateRange?.trim() || "past-year";
  const linkedinCountryCode = body.linkedinCountryCode?.trim() ?? "";
  let tiktokMaxAds = Math.max(1, Math.min(body.tiktokMaxAds ?? DEFAULT_ADS, MAX_ADS));
  const tiktokStartDate = body.tiktokStartDate?.trim();
  const tiktokEndDate = body.tiktokEndDate?.trim();
  const microsoftMaxSearchResults = Math.max(
    24,
    Math.min(body.microsoftMaxSearchResults ?? DEFAULT_ADS, MAX_ADS, 1000)
  );
  const microsoftCountryCodes = microsoftMarketCodeToArray(body.microsoftCountryCode ?? "66");
  const microsoftStartDate = body.microsoftStartDate?.trim();
  const microsoftEndDate = body.microsoftEndDate?.trim();
  let pinterestMaxResults = Math.max(
    1,
    Math.min(body.pinterestMaxResults ?? DEFAULT_ADS, MAX_ADS, 1000),
  );
  const pinterestStartDate = body.pinterestStartDate?.trim();
  const pinterestEndDate = body.pinterestEndDate?.trim();
  const pinterestGender = body.pinterestGender?.trim();
  const pinterestAge = body.pinterestAge?.trim();
  let snapchatMaxItems = Math.max(
    10,
    Math.min(body.snapchatMaxItems ?? Math.min(DEFAULT_ADS, 300), MAX_ADS, 10000),
  );
  const snapchatCountryIso = body.snapchatCountry?.trim().toUpperCase() ?? "";
  const snapchatStartDate = body.snapchatStartDate?.trim();
  const snapchatEndDate = body.snapchatEndDate?.trim();
  const tiktokRegion = normalizeTikTokAdsRegion(body.tiktokRegion);
  const googleRegion = normalizeGoogleAdsRegion(body.googleRegion);
  let googleResultsLimit = normalizeGoogleAdsResultsLimit(body.googleResultsLimit);
  const pinterestCountry = normalizePinterestAdsCountry(body.pinterestCountry);
  const platformsRequested = new Set<AdsLibraryPlatform>();
  if (Array.isArray(body.platforms)) {
    if (body.platforms.length === 0) {
      /* explicit [] = skip all */
    } else {
      for (const p of body.platforms) {
        if (ALL_ADS_API_PLATFORMS.includes(p as AdsLibraryPlatform)) {
          platformsRequested.add(p as AdsLibraryPlatform);
        }
      }
    }
  } else {
    ALL_ADS_API_PLATFORMS.forEach((p) => platformsRequested.add(p));
  }

  const apifyMissing = !process.env.APIFY_TOKEN?.trim();
  if (platformsRequested.size > 0 && apifyMissing) {
    const msg = "APIFY_TOKEN is not configured";
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: msg,
        meta: { ads: [], error: msg },
        google: { rows: [], error: msg },
        linkedin: { ads: [], error: msg },
        tiktok: { ads: [], error: msg },
        microsoft: { ads: [], error: msg },
        pinterest: { ads: [], error: msg },
        snapchat: { ads: [], error: msg },
      },
      { status: 503 }
    );
  }

  let pinterestAdvertiserNameForApify = "";
  let pinterestConfirmedAdvertiserQuery: string | undefined;
  if (platformsRequested.has("pinterest")) {
    const fromPinterestIds =
      extractPinterestHandleFromUrlOrString(ids.pinterest ?? "") ||
      extractPinterestHandleFromUrlOrString(ids.pinterestAdvertiserName ?? "") ||
      "";
    if (fromPinterestIds.trim()) {
      pinterestConfirmedAdvertiserQuery = fromPinterestIds.trim();
    }
    pinterestAdvertiserNameForApify =
      fromPinterestIds.trim() || extractPinterestHandleFromUrlOrString(brandName);
    if (!pinterestAdvertiserNameForApify.trim()) {
      const err = "Add a Pinterest profile URL or advertiser handle.";
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          error: err,
          meta: { ads: [], error: null },
          google: { rows: [], error: null },
          linkedin: { ads: [], error: null },
          tiktok: { ads: [], error: null },
          microsoft: { ads: [], error: null },
          pinterest: { ads: [], error: err },
          snapchat: { ads: [], error: null },
        },
        { status: 400 }
      );
    }
  }

  const snapchatConfirmedAdvertiserQuery =
    typeof ids.snapchat === "string" && ids.snapchat.trim() ? ids.snapchat.trim() : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const skipCache = body.skipCache === true;
  const scrapeIntent = body.intent === "manual" ? "manual" : "discovery";
  const filterGoogleActiveToday = body.filterGoogleActiveToday === true;
  const cacheOnly = body.cacheOnly === true;
  const domainNorm = domain.toLowerCase();

  let adsCacheDomain = domainNorm;
  let adsCacheReadDomains: string[] = domainNorm ? [domainNorm] : [];
  let resolvedCompetitorId: string | null = null;
  if (userId && domainNorm) {
    const libraryChannels = Array.isArray(body.libraryChannels)
      ? body.libraryChannels.filter((c): c is string => typeof c === "string" && c.trim() !== "")
      : undefined;
    const syncedId = await syncSavedCompetitorLibraryContext(supabase, {
      userId,
      domainHint: domainNorm,
      ids,
      channels: libraryChannels,
      confirmed: true,
    });
    const resolved = await resolveAdsCacheDomainForUser(supabase, userId, domainNorm);
    adsCacheDomain = resolved.cacheDomain;
    adsCacheReadDomains = resolved.readDomains;
    resolvedCompetitorId = syncedId ?? resolved.competitorId;
  }

  const platformCacheHits = new Map<CacheablePlatform, unknown>();
  let platformsNeedingScrape = new Set<AdsLibraryPlatform>();
  if (platformsRequested.size > 0) {
    if (userId && domainNorm && !skipCache) {
      const platformsToCheck = [...platformsRequested].filter(isCacheablePlatform);
      if (platformsToCheck.length > 0 && adsCacheReadDomains.length > 0) {
        const nowIso = new Date().toISOString();
        const { data: cachedRows } = await supabase
          .from("ads_cache")
          .select("platform, ads_data, competitor_domain, scraped_at, expires_at")
          .eq("user_id", userId)
          .in("competitor_domain", adsCacheReadDomains)
          .in("platform", platformsToCheck);
        const picked = pickBestAdsCacheHitsByPlatform((cachedRows ?? []) as AdsCachePickRow[], adsCacheDomain, nowIso);
        for (const [p, data] of picked) {
          platformCacheHits.set(p, data);
        }
      }
      platformsNeedingScrape = new Set(platformsRequested);
      for (const p of platformCacheHits.keys()) {
        platformsNeedingScrape.delete(p);
      }
    } else {
      platformsNeedingScrape = new Set(platformsRequested);
    }
  }

  if (cacheOnly) {
    platformsNeedingScrape = new Set();
  }

  if (platformsNeedingScrape.size > 0) {
    if (!userId) {
      return NextResponse.json(billingRequiredResponseBody("Sign in and start your subscription to run fresh ad-library searches."), {
        status: 401,
      });
    }

    const billing = await getBillingEntitlement(supabase, userId);
    if (!billing.hasAccess) {
      return NextResponse.json(
        billingRequiredResponseBody("Upgrade to Starter or Pro to run fresh ad-library searches."),
        { status: 402 },
      );
    }

    if (
      skipCache &&
      scrapeIntent === "manual" &&
      !billing.limits.allowManualRefresh &&
      !billing.isUnlimited
    ) {
      return NextResponse.json(featureNotAvailableResponseBody("Manual refresh"), { status: 403 });
    }

    const requestedOps = [...platformsNeedingScrape].filter(isCacheablePlatform).length;
    const freeTrialCheck = await checkFreeTrialScrapeAllowedForUser(
      supabase,
      userId,
      billing,
      requestedOps,
    );
    if (!freeTrialCheck.ok) {
      return NextResponse.json(freeTrialScrapeUsedResponseBody(), { status: freeTrialCheck.status });
    }

    const trialCap = billing.limits.initialScrapeAdsPerPlatform;
    if (billing.planTier === "free_trial" && trialCap != null) {
      metaMaxAds = Math.min(metaMaxAds, trialCap);
      linkedinMaxAds = Math.min(linkedinMaxAds, trialCap);
      tiktokMaxAds = Math.min(tiktokMaxAds, trialCap);
      pinterestMaxResults = Math.min(pinterestMaxResults, trialCap);
      snapchatMaxItems = Math.min(snapchatMaxItems, trialCap);
      googleResultsLimit = Math.min(googleResultsLimit, trialCap);
    }

    const yearMonthUtc = new Date().toISOString().slice(0, 7);
    const { data: monthUsage } = await supabase
      .from("monthly_scrape_usage")
      .select("ads_scraped, scrape_operations")
      .eq("user_id", userId)
      .eq("year_month", yearMonthUtc)
      .maybeSingle();
    const currentAds = monthUsage?.ads_scraped ?? 0;
    const perPlatformCaps: Partial<Record<AdsLibraryPlatform, number>> = {
      meta: metaMaxAds,
      google: googleResultsLimit,
      linkedin: linkedinMaxAds,
      tiktok: tiktokMaxAds,
      pinterest: pinterestMaxResults,
      snapchat: snapchatMaxItems,
      microsoft: microsoftMaxSearchResults,
    };
    const requestedAds = estimateAdsForPlatforms(
      [...platformsNeedingScrape].filter(isCacheablePlatform),
      perPlatformCaps,
    );
    if (
      !billing.isUnlimited &&
      requestedAds > 0 &&
      currentAds + requestedAds > billing.limits.maxAdsProcessedPerMonth
    ) {
      return NextResponse.json(
        quotaExceededResponseBody({
          used: currentAds,
          requested: requestedAds,
          limit: billing.limits.maxAdsProcessedPerMonth,
        }),
        { status: 402 },
      );
    }
  }

  const out: AdsLibraryResponse = {
    ok: true,
    configured: true,
    meta: { ads: [], error: null },
    google: { rows: [], error: null },
    linkedin: { ads: [], error: null },
    tiktok: { ads: [], error: null },
    microsoft: { ads: [], error: null },
    pinterest: { ads: [], error: null },
    snapchat: { ads: [], error: null },
  };

  for (const [platform, data] of platformCacheHits) {
    if (platform === "meta")
      out.meta = data as AdsLibraryResponse["meta"];
    if (platform === "google")
      out.google = data as AdsLibraryResponse["google"];
    if (platform === "linkedin")
      out.linkedin = data as AdsLibraryResponse["linkedin"];
    if (platform === "tiktok")
      out.tiktok = data as AdsLibraryResponse["tiktok"];
    if (platform === "pinterest")
      out.pinterest = data as AdsLibraryResponse["pinterest"];
    if (platform === "microsoft")
      out.microsoft = data as AdsLibraryResponse["microsoft"];
    if (platform === "snapchat")
      out.snapchat = data as AdsLibraryResponse["snapchat"];
  }

  const isPartial = platformsRequested.size < ALL_ADS_API_PLATFORMS.length;

  await runAdsLibraryParallelScrape({
    ids,
    brandName,
    domain,
    linkedinKeywordFallback,
    pinterestAdvertiserNameForApify,
    platformsRequested,
    platformsNeedingScrape,
    out,
    metaStatus,
    metaMaxAds,
    metaCountry,
    metaStartDate,
    metaEndDate,
    metaSortBy,
    linkedinMaxAds,
    linkedinDateRange,
    linkedinCountryCode,
    tiktokMaxAds,
    tiktokStartDate,
    tiktokEndDate,
    microsoftMaxSearchResults,
    microsoftCountryCodes,
    microsoftStartDate,
    microsoftEndDate,
    pinterestMaxResults,
    pinterestStartDate,
    pinterestEndDate,
    pinterestGender,
    pinterestAge,
    snapchatMaxItems,
    snapchatCountryIso,
    snapchatStartDate,
    snapchatEndDate,
    tiktokRegion,
    googleRegion,
    googleResultsLimit,
    pinterestCountry,
    pinterestConfirmedAdvertiserQuery,
    snapchatConfirmedAdvertiserQuery,
  });

  if (filterGoogleActiveToday && out.google.rows.length > 0) {
    out.google = {
      ...out.google,
      rows: filterGoogleRowsActiveToday(out.google.rows),
    };
  }

  if (userId) {
    await finalizeAdsLibraryAfterFreshScrape(supabase, {
      userId,
      resolvedCompetitorId,
      domainNorm,
      adsCacheDomain,
      platformsRequested,
      platformsNeedingScrape,
      out,
    });
  }

  /** Refresh Strategy Map whenever ads are loaded (cache hit or fresh scrape) so derivation/spend stay current. */
  const shouldRefreshStrategyOverview =
    Boolean(userId && resolvedCompetitorId) &&
    [...platformsRequested].some(
      (p) => platformScrapeSucceeded(out, p) && countLibraryAdsForPlatform(p, out) > 0
    );

  if (shouldRefreshStrategyOverview && userId && resolvedCompetitorId) {
    void recomputeStrategyOverviewForCompetitor({
      supabase,
      userId,
      competitorId: resolvedCompetitorId,
      domainHint: domainNorm,
    }).then((r) => {
      if (!r.ok) console.warn("[api/ads/library] strategy overview recompute:", r.error);
    });
  }

  if (isPartial) {
    const partialBody: Record<string, unknown> = {
      ok: out.ok,
      configured: out.configured,
      partial: true,
    };
    if (platformsRequested.has("meta")) partialBody.meta = out.meta;
    if (platformsRequested.has("google")) partialBody.google = out.google;
    if (platformsRequested.has("linkedin")) partialBody.linkedin = out.linkedin;
    if (platformsRequested.has("tiktok")) partialBody.tiktok = out.tiktok;
    if (platformsRequested.has("microsoft")) partialBody.microsoft = out.microsoft;
    if (platformsRequested.has("pinterest")) partialBody.pinterest = out.pinterest;
    if (platformsRequested.has("snapchat")) partialBody.snapchat = out.snapchat;
    return NextResponse.json(partialBody as unknown as AdsLibraryResponse);
  }

  return NextResponse.json(out);
}