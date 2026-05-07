import { NextResponse } from "next/server";
import { ApifyRunnerError } from "@/lib/apify/client";
import { scrapeFacebookAds } from "@/lib/apify/facebook-ads";
import { buildGoogleSearchTerms, scrapeGoogleAdsTransparency } from "@/lib/apify/google-ads";
import { scrapeLinkedInAdLibrary } from "@/lib/apify/linkedin-ads";
import { scrapePinterestAdsLibrary } from "@/lib/apify/pinterest-ads";
import { scrapeTikTokAdsLibrary } from "@/lib/apify/tiktok-ads";
import {
  googleItemToRow,
  linkedInItemToCard,
  pinterestDatasetItemToCard,
} from "@/lib/ad-library/normalize";
import { ADS_CACHE_TTL_MS, CACHEABLE_PLATFORMS, type CacheablePlatform } from "@/lib/ad-library/cache-ttl";
import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import { normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ADS = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;
const DEFAULT_META_MAX_ADS = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;

type Ids = {
  meta?: string;
  metaPageUrl?: string;
  google?: string;
  linkedin?: string;
  microsoft?: string;
  /** pinterest.com profile URL — handle is derived for Apify (preferred when set). */
  pinterest?: string;
  /** Optional override: handle or URL (normalized); otherwise brand name is used. */
  pinterestAdvertiserName?: string;
};

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || d;
}

function isCacheablePlatform(p: AdsLibraryPlatform): p is CacheablePlatform {
  return (CACHEABLE_PLATFORMS as readonly string[]).includes(p);
}

/**
 * POST /api/ads/library
 * Body: { brand, ids? (pinterest URL + optional pinterestAdvertiserName), metaStatus?, …, pinterestCountry? … }
 * All platforms use Apify (APIFY_TOKEN).
 */
export async function POST(req: Request): Promise<NextResponse<AdsLibraryResponse>> {
  let body: {
    brand?: { name?: string; domain?: string };
    ids?: Ids;
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
    pinterestMaxResults?: number;
    pinterestStartDate?: string;
    pinterestEndDate?: string;
    pinterestGender?: string;
    pinterestAge?: string;
    /** When true, Google Apify actor uses skipDetails: false (slower, richer fields). */
    googleGetAdDetails?: boolean;
    /** TikTok Ads Library actor — must be one of the allowed region codes (default `all`). */
    tiktokRegion?: string;
    /** Google Transparency `region` — `anywhere` or ISO 3166-1 alpha-2 (default `anywhere`). */
    googleRegion?: string;
    /** Google `resultsLimit` (default 50, max 500). */
    googleResultsLimit?: number;
    /** Pinterest transparency actor — EU-27, BR, or TR (default `DE`). */
    pinterestCountry?: string;
    platforms?: AdsLibraryPlatform[];
    /** When true, skip server-side `ads_cache` and run Apify for all requested platforms. */
    skipCache?: boolean;
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
  const ids: Ids = body.ids ?? {};
  const metaStatus = body.metaStatus === "ALL" ? "ALL" : "ACTIVE";
  const metaMaxAds = Math.max(1, Math.min(body.metaMaxAds ?? DEFAULT_META_MAX_ADS, MAX_ADS));
  const metaCountry = (body.metaCountry ?? "US").trim().toUpperCase() || "US";
  const metaStartDate = body.metaStartDate?.trim();
  const metaEndDate = body.metaEndDate?.trim();
  const metaSortBy = (body.metaSortBy ?? "impressions_desc").trim() || "impressions_desc";
  const linkedinMaxAds = Math.max(
    1,
    Math.min(body.linkedinMaxAds ?? MAX_ADS, MAX_ADS)
  );
  const linkedinDateRange = body.linkedinDateRange?.trim() || "past-year";
  const linkedinCountryCode = body.linkedinCountryCode?.trim() ?? "";
  const tiktokMaxAds = Math.max(1, Math.min(body.tiktokMaxAds ?? MAX_ADS, MAX_ADS));
  const tiktokStartDate = body.tiktokStartDate?.trim();
  const tiktokEndDate = body.tiktokEndDate?.trim();
  const pinterestMaxResults = Math.max(
    1,
    Math.min(body.pinterestMaxResults ?? MAX_ADS, MAX_ADS, 1000)
  );
  const pinterestStartDate = body.pinterestStartDate?.trim();
  const pinterestEndDate = body.pinterestEndDate?.trim();
  const pinterestGender = body.pinterestGender?.trim();
  const pinterestAge = body.pinterestAge?.trim();
  /** Default true so Apify returns creative images; client can send `false` to save credits. */
  const googleDetails = body.googleGetAdDetails !== false;
  const tiktokRegion = normalizeTikTokAdsRegion(body.tiktokRegion);
  const googleRegion = normalizeGoogleAdsRegion(body.googleRegion);
  const googleResultsLimit = normalizeGoogleAdsResultsLimit(body.googleResultsLimit);
  const pinterestCountry = normalizePinterestAdsCountry(body.pinterestCountry);
  const ALL_PLATFORMS = ALL_ADS_API_PLATFORMS;
  const platformsRequested = new Set<AdsLibraryPlatform>();
  if (Array.isArray(body.platforms)) {
    if (body.platforms.length === 0) {
      /* explicit [] = skip all */
    } else {
      for (const p of body.platforms) {
        if (ALL_PLATFORMS.includes(p as AdsLibraryPlatform)) {
          platformsRequested.add(p as AdsLibraryPlatform);
        }
      }
    }
  } else {
    ALL_PLATFORMS.forEach((p) => platformsRequested.add(p));
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
  if (platformsRequested.has("pinterest")) {
    pinterestAdvertiserNameForApify =
      extractPinterestHandleFromUrlOrString(ids.pinterest ?? "") ||
      extractPinterestHandleFromUrlOrString(ids.pinterestAdvertiserName ?? "") ||
      extractPinterestHandleFromUrlOrString(brandName);
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const skipCache = body.skipCache === true;
  const domainNorm = domain.toLowerCase();

  const platformCacheHits = new Map<CacheablePlatform, unknown>();
  let platformsNeedingScrape = new Set<AdsLibraryPlatform>();
  if (platformsRequested.size > 0) {
    if (userId && domainNorm && !skipCache) {
      const platformsToCheck = [...platformsRequested].filter(isCacheablePlatform);
      if (platformsToCheck.length > 0) {
        const { data: cachedRows } = await supabase
          .from("ads_cache")
          .select("platform, ads_data")
          .eq("user_id", userId)
          .eq("competitor_domain", domainNorm)
          .in("platform", platformsToCheck)
          .gt("expires_at", new Date().toISOString());
        for (const row of cachedRows ?? []) {
          const pl = row.platform;
          if (pl && isCacheablePlatform(pl as AdsLibraryPlatform)) {
            platformCacheHits.set(pl as CacheablePlatform, row.ads_data);
          }
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
    if (platform === "snapchat") out.snapchat = data as AdsLibraryResponse["snapchat"];
  }

  const isPartial = platformsRequested.size < ALL_PLATFORMS.length;

  await Promise.all([
    (async () => {
      if (!platformsRequested.has("meta") || !platformsNeedingScrape.has("meta")) return;
      try {
        out.meta.ads = await scrapeFacebookAds({
          ids,
          brandName,
          activeStatus: metaStatus,
          maxAds: metaMaxAds,
          countryCode: metaCountry,
          metaStartDate,
          metaEndDate,
          scrapePageAdsSortBy: metaSortBy,
        });
      } catch (e) {
        out.meta.error =
          e instanceof ApifyRunnerError || e instanceof Error ? e.message : "Meta ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("google") || !platformsNeedingScrape.has("google")) return;
      try {
        const dom = ids.google?.trim() ? cleanDomain(ids.google) : domain;
        if (!dom) {
          out.google.error = "No domain for Google ads";
          return;
        }
        const terms = buildGoogleSearchTerms(dom, brandName);
        const rows = await scrapeGoogleAdsTransparency({
          searchTerms: terms,
          region: googleRegion,
          resultsLimit: googleResultsLimit,
          skipDetails: !googleDetails,
        });
        out.google.rows = rows
          .slice(0, googleResultsLimit)
          .map((item, i) => googleItemToRow(item, i, { queryDomain: dom }));
      } catch (e) {
        out.google.error = e instanceof Error ? e.message : "Google ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("linkedin") || !platformsNeedingScrape.has("linkedin")) return;
      try {
        const raw = await scrapeLinkedInAdLibrary({
          brandName,
          linkedinUrl: ids.linkedin,
          maxItems: linkedinMaxAds,
          dateRange: linkedinDateRange,
          countryCode: linkedinCountryCode || undefined,
        });
        out.linkedin.ads = raw
          .slice(0, linkedinMaxAds)
          .map((item, i) => linkedInItemToCard(item, i));
      } catch (e) {
        out.linkedin.error = e instanceof Error ? e.message : "LinkedIn ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("tiktok") || !platformsNeedingScrape.has("tiktok")) return;
      try {
        out.tiktok.ads = await scrapeTikTokAdsLibrary({
          brandName,
          region: tiktokRegion,
          maxAds: tiktokMaxAds,
          fetchDetails: true,
          startDate: tiktokStartDate,
          endDate: tiktokEndDate,
        });
      } catch (e) {
        out.tiktok.error = e instanceof Error ? e.message : "TikTok ads failed";
      }
    })(),
    (async () => {
      if (!platformsRequested.has("pinterest") || !platformsNeedingScrape.has("pinterest")) return;
      try {
        const rows = await scrapePinterestAdsLibrary({
          advertiserName: pinterestAdvertiserNameForApify,
          maxResults: pinterestMaxResults,
          country: pinterestCountry,
          startDate: pinterestStartDate,
          endDate: pinterestEndDate,
          gender: pinterestGender,
          age: pinterestAge,
        });
        out.pinterest.ads = rows
          .slice(0, pinterestMaxResults)
          .map((raw, i) => pinterestDatasetItemToCard(raw, i));
      } catch (e) {
        out.pinterest.error =
          e instanceof ApifyRunnerError || e instanceof Error ? e.message : "Pinterest ads failed";
      }
    })(),
  ]);

  if (userId && domainNorm && platformsNeedingScrape.size > 0) {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ADS_CACHE_TTL_MS).toISOString();
    const rows: {
      user_id: string;
      competitor_domain: string;
      platform: string;
      ads_data: Json;
      scraped_at: string;
      expires_at: string;
    }[] = [];

    for (const p of platformsNeedingScrape) {
      if (!isCacheablePlatform(p)) continue;
      const adsData: Json = (
        p === "meta"
          ? out.meta
          : p === "google"
            ? out.google
            : p === "linkedin"
              ? out.linkedin
              : p === "tiktok"
                ? out.tiktok
                : p === "pinterest"
                  ? out.pinterest
                  : out.snapchat
      ) as unknown as Json;
      rows.push({
        user_id: userId,
        competitor_domain: domainNorm,
        platform: p,
        ads_data: adsData,
        scraped_at: now,
        expires_at: expiresAt,
      });
    }

    if (rows.length > 0) {
      const { error: upsertError } = await supabase.from("ads_cache").upsert(rows, {
        onConflict: "user_id,competitor_domain,platform",
      });
      if (upsertError) {
        console.error("[api/ads/library] ads_cache upsert", upsertError);
      }
      if (!isPartial) {
        const { error: lastScrapedError } = await supabase
          .from("saved_competitors")
          .update({ last_scraped_at: now })
          .eq("user_id", userId)
          .eq("brand_domain", domainNorm);
        if (lastScrapedError) {
          console.error("[api/ads/library] last_scraped_at update", lastScrapedError);
        }
      }
    }
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
    if (platformsRequested.has("pinterest")) partialBody.pinterest = out.pinterest;
    if (platformsRequested.has("snapchat")) partialBody.snapchat = out.snapchat;
    return NextResponse.json(partialBody as unknown as AdsLibraryResponse);
  }

  return NextResponse.json(out);
}
