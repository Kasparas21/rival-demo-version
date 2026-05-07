import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import {
  countLibraryAdsForPlatform,
  persistScrapedAdsFromAdsLibraryResponse,
  platformScrapeSucceeded,
} from "@/lib/ad-library/persist-scraped-ads";
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

/**
 * When `scraped_ads` is still empty (e.g. creative data only lived in `ads_cache`), copy cache into
 * `scraped_ads` using the same row shape as live Apify runs so Strategy Overview can derive + enrich.
 *
 * Uses latest row per platform even if TTL expired — Strategy hydration should not be stricter than Ads Library UX.
 */
export async function tryHydrateScrapedAdsFromAdsCache(
  supabase: SupabaseClient<Database>,
  params: { userId: string; competitorId: string; domainHint: string }
): Promise<boolean> {
  const { userId, competitorId, domainHint } = params;

  const { count, error: cErr } = await supabase
    .from("scraped_ads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true);

  if (cErr) {
    console.warn("[strategy-hydrate] scraped_ads count:", cErr.message);
  }
  if ((count ?? 0) > 0) {
    console.log(`[hydration] skip persist — scraped_ads already has ${count} active rows`);
    return false;
  }

  const { cacheDomain, readDomains } = await resolveAdsCacheDomainForUser(supabase, userId, domainHint);
  if (readDomains.length === 0) {
    console.log(`[hydration] no readDomains for domainHint=${domainHint}`);
    return false;
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
    console.warn("[strategy-hydrate] ads_cache:", initialCache.error.message);
    return false;
  }

  let cacheRows = initialCache.data ?? [];

  if (!cacheRows.length) {
    const expanded = expandAdsCacheDomainCandidates(readDomains);
    const retry = await fetchCache(expanded);
    if (retry.error) {
      console.warn("[strategy-hydrate] ads_cache expanded:", retry.error.message);
      return false;
    }
    cacheRows = retry.data ?? [];
    if (!cacheRows.length) {
      for (const p of ALL_ADS_API_PLATFORMS) {
        console.warn(`[hydration] cache miss for domain=${cacheDomain} platform=${p}`);
      }
      return false;
    }
  }

  const latestByPlatform = new Map<string, (typeof cacheRows)[0]>();
  for (const row of cacheRows) {
    const prev = latestByPlatform.get(row.platform);
    if (!prev || Date.parse(row.scraped_at) > Date.parse(prev.scraped_at)) {
      latestByPlatform.set(row.platform, row);
    }
  }

  const presentPlatforms = new Set(latestByPlatform.keys());
  for (const p of ALL_ADS_API_PLATFORMS) {
    if (!presentPlatforms.has(p)) {
      console.warn(`[hydration] cache miss for domain=${cacheDomain} platform=${p}`);
    }
  }

  const merged = [...latestByPlatform.values()];
  const out = adsLibraryResponseFromAdsCacheRows(merged);

  const platformsToPersist = new Set<AdsLibraryPlatform>();
  for (const p of ALL_ADS_API_PLATFORMS) {
    if (platformScrapeSucceeded(out, p) && countLibraryAdsForPlatform(p, out) > 0) {
      platformsToPersist.add(p);
    }
  }

  if (platformsToPersist.size === 0) {
    console.log(`[hydration] no platforms with successful scrape + ads to persist (domain=${cacheDomain})`);
    return false;
  }

  const nowIso = new Date().toISOString();
  await persistScrapedAdsFromAdsLibraryResponse(supabase, {
    userId,
    competitorId,
    domainNorm: cacheDomain,
    platformsToPersist,
    out,
    nowIso,
  });

  console.log(
    `[hydration] persisted from ads_cache → platforms=${[...platformsToPersist].join(",")} domain=${cacheDomain}`
  );
  return true;
}
