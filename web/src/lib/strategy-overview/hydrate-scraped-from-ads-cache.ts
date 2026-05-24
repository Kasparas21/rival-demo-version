import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { pickBestAdsCacheRowMapByPlatform, type AdsCachePickRow } from "@/lib/ad-library/ads-cache-pick";
import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import {
  countLibraryAdsForPlatform,
  platformScrapeSucceeded,
} from "@/lib/ad-library/library-response-utils";
import { persistScrapedAdsFromAdsLibraryResponse, libraryPlatformHasActiveScrapedRows } from "@/lib/ad-library/persist-scraped-ads";
import type { Database } from "@/lib/supabase/types";

function emptyResponse(): AdsLibraryResponse {
  return {
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
}

/** Lowercase, strip trailing slashes, and add www / non-www variants for cache matching. */
export function expandAdsCacheDomainCandidates(readDomains: string[]): string[] {
  const out = new Set<string>();
  for (const raw of readDomains) {
    const d = raw.trim().toLowerCase().replace(/\/+$/, "");
    if (!d) continue;
    out.add(d);
    if (d.startsWith("www.")) {
      out.add(d.slice(4));
    } else {
      out.add(`www.${d}`);
    }
  }
  return [...out].filter(Boolean);
}

export async function countAdsCacheRowsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorDomains: string[]
): Promise<number> {
  if (competitorDomains.length === 0) return 0;
  const { count, error } = await supabase
    .from("ads_cache")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("competitor_domain", competitorDomains);
  if (error) {
    console.warn("[strategy-hydrate] ads_cache count:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Merge latest `ads_cache` rows into one {@link AdsLibraryResponse} for persistence into `scraped_ads`.
 */
export function adsLibraryResponseFromAdsCacheRows(
  rows: { platform: string; ads_data: unknown }[]
): AdsLibraryResponse {
  const out = emptyResponse();
  for (const row of rows) {
    const p = row.platform as AdsLibraryPlatform;
    if (!ALL_ADS_API_PLATFORMS.includes(p)) continue;
    const d = row.ads_data;
    if (!d || typeof d !== "object") continue;
    switch (p) {
      case "meta":
        out.meta = d as AdsLibraryResponse["meta"];
        break;
      case "google":
        out.google = d as AdsLibraryResponse["google"];
        break;
      case "linkedin":
        out.linkedin = d as AdsLibraryResponse["linkedin"];
        break;
      case "tiktok":
        out.tiktok = d as AdsLibraryResponse["tiktok"];
        break;
      case "microsoft":
        out.microsoft = d as AdsLibraryResponse["microsoft"];
        break;
      case "pinterest":
        out.pinterest = d as AdsLibraryResponse["pinterest"];
        break;
      case "snapchat":
        out.snapchat = d as AdsLibraryResponse["snapchat"];
        break;
      default:
        break;
    }
  }
  return out;
}

export type HydrateFromAdsCacheResult = {
  ok: boolean;
  reason: string;
  persistedPlatforms: string[];
  errors: string[];
  rowsInserted: number;
};

/**
 * When `scraped_ads` is still empty (e.g. creative data only lived in `ads_cache`), copy cache into
 * `scraped_ads` using the same row shape as live Apify runs so Strategy Overview can derive + enrich.
 *
 * Uses latest row per platform even if TTL expired — Strategy hydration should not be stricter than Ads Library UX.
 */
export async function tryHydrateScrapedAdsFromAdsCache(
  supabase: SupabaseClient<Database>,
  params: { userId: string; competitorId: string; domainHint: string }
): Promise<HydrateFromAdsCacheResult> {
  const { userId, competitorId, domainHint } = params;
  const trace = { userId, competitorId, domainHint };
  const none = (reason: string, errors: string[] = []): HydrateFromAdsCacheResult => ({
    ok: false,
    reason,
    persistedPlatforms: [],
    errors,
    rowsInserted: 0,
  });

  console.error("[hydration:enter]", trace);

  const { data: existingRows, error: existingErr } = await supabase
    .from("scraped_ads")
    .select("platform")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true);

  if (existingErr) {
    console.error("[hydration:check_active_failed]", { ...trace, error: existingErr.message });
    return none("check_active_failed", [existingErr.message]);
  }

  const existingActivePlatforms = new Set((existingRows ?? []).map((r) => r.platform));
  console.error("[hydration:existing_active_platforms]", {
    ...trace,
    platforms: [...existingActivePlatforms],
    count: existingActivePlatforms.size,
  });

  const { cacheDomain, readDomains } = await resolveAdsCacheDomainForUser(supabase, userId, domainHint);
  console.error("[hydration:resolved_domains]", { ...trace, cacheDomain, readDomains });

  if (readDomains.length === 0) {
    console.error("[hydration:no_read_domains]", trace);
    return none("no_read_domains");
  }

  const fetchCache = async (domains: string[]) => {
    const { data, error } = await supabase
      .from("ads_cache")
      .select("platform, ads_data, scraped_at, competitor_domain")
      .eq("user_id", userId)
      .in("competitor_domain", domains);
    return { data, error };
  };

  const initialCache = await fetchCache(readDomains);
  if (initialCache.error) {
    console.error("[hydration:cache_fetch_failed]", { ...trace, error: initialCache.error.message });
    return none("cache_fetch_failed", [initialCache.error.message]);
  }

  let cacheRows = initialCache.data ?? [];

  if (!cacheRows.length) {
    const expanded = expandAdsCacheDomainCandidates(readDomains);
    console.error("[hydration:retry_expanded_domains]", { ...trace, expanded });
    const retry = await fetchCache(expanded);
    if (retry.error) {
      console.error("[hydration:cache_fetch_expanded_failed]", { ...trace, error: retry.error.message });
      return none("cache_fetch_failed", [retry.error.message]);
    }
    cacheRows = retry.data ?? [];
  }

  console.error("[hydration:cache_rows]", {
    ...trace,
    count: cacheRows.length,
    domainsFound: [...new Set(cacheRows.map((r) => r.competitor_domain))],
    platforms: [...new Set(cacheRows.map((r) => r.platform))],
  });

  if (!cacheRows.length) {
    for (const p of ALL_ADS_API_PLATFORMS) {
      console.error("[hydration:cache_miss_platform]", { ...trace, domain: cacheDomain, platform: p });
    }
    return none("no_cache_rows");
  }

  const latestByPlatform = pickBestAdsCacheRowMapByPlatform(
    cacheRows as AdsCachePickRow[],
    cacheDomain,
    new Date().toISOString(),
  );

  const presentPlatforms = new Set(latestByPlatform.keys());
  for (const p of ALL_ADS_API_PLATFORMS) {
    if (!presentPlatforms.has(p)) {
      console.error("[hydration:cache_miss_platform]", { ...trace, domain: cacheDomain, platform: p });
    }
  }

  const merged = [...latestByPlatform.values()];
  const out = adsLibraryResponseFromAdsCacheRows(merged);

  const platformReport: {
    platform: string;
    scrapeOk: boolean;
    count: number;
    error: string | null;
    included: boolean;
  }[] = [];
  const platformsToPersist = new Set<AdsLibraryPlatform>();

  for (const p of ALL_ADS_API_PLATFORMS) {
    const scrapeOk = platformScrapeSucceeded(out, p);
    const adCount = countLibraryAdsForPlatform(p, out);
    const errVal =
      p === "meta"
        ? out.meta.error
        : p === "google"
          ? out.google.error
          : p === "linkedin"
            ? out.linkedin.error
            : p === "tiktok"
              ? out.tiktok.error
              : p === "microsoft"
                ? out.microsoft.error
                : p === "pinterest"
                  ? out.pinterest.error
                  : out.snapchat.error;
    const included = scrapeOk && adCount > 0;
    const missingFromDb = included && !libraryPlatformHasActiveScrapedRows(p, existingActivePlatforms);
    platformReport.push({
      platform: p,
      scrapeOk,
      count: adCount,
      error: errVal ?? null,
      included: missingFromDb,
    });
    if (missingFromDb) platformsToPersist.add(p);
  }

  console.error("[hydration:platform_report]", { ...trace, platformReport });

  if (platformsToPersist.size === 0) {
    console.error("[hydration:all_platforms_already_hydrated]", trace);
    return {
      ok: true,
      reason: "all_platforms_already_hydrated",
      persistedPlatforms: [],
      errors: [],
      rowsInserted: 0,
    };
  }

  const nowIso = new Date().toISOString();
  let persistResult;
  try {
    persistResult = await persistScrapedAdsFromAdsLibraryResponse(supabase, {
      userId,
      competitorId,
      domainNorm: cacheDomain,
      platformsToPersist,
      out,
      nowIso,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hydration:persist_threw]", { ...trace, error: message });
    return {
      ok: false,
      reason: "persist_threw",
      persistedPlatforms: [...platformsToPersist],
      errors: [message],
      rowsInserted: 0,
    };
  }

  console.error("[hydration:persist_result]", { ...trace, persistResult });

  if (!persistResult.ok) {
    return {
      ok: false,
      reason: "persist_failed",
      persistedPlatforms: [...platformsToPersist],
      errors: persistResult.errors,
      rowsInserted: persistResult.rowsInserted,
    };
  }

  return {
    ok: true,
    reason: "persisted",
    persistedPlatforms: [...platformsToPersist],
    errors: [],
    rowsInserted: persistResult.rowsInserted,
  };
}
