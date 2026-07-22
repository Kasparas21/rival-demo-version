import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { pickBestAdsCacheRowMapByPlatform, type AdsCachePickRow } from "@/lib/ad-library/ads-cache-pick";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import {
  adsLibraryResponseFromAdsCacheRows,
  expandAdsCacheDomainCandidates,
} from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import { supplementAdsLibraryFromScrapedAds } from "@/lib/ad-library/supplement-library-from-scraped-ads";
import type { Database } from "@/lib/supabase/types";

export type AdsCacheUserFetchResult = {
  response: AdsLibraryResponse;
  pickedRows: AdsCachePickRow[];
  cacheDomain: string;
};

/**
 * Best-effort merge of the user's latest `ads_cache` rows for a competitor/workspace domain hint.
 * Does not enforce TTL — prioritizes grounding the coach view over freshness.
 */
export async function fetchLatestAdsLibraryFromUserCache(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string,
): Promise<AdsLibraryResponse | null> {
  const bundle = await fetchLatestAdsLibraryBundleFromUserCache(supabase, userId, domainHint);
  return bundle?.response ?? null;
}

export async function fetchLatestAdsLibraryBundleFromUserCache(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string,
): Promise<AdsCacheUserFetchResult | null> {
  const trimmed = domainHint.trim();
  if (!trimmed) return null;
  const cleaned = normalizeCompetitorSlug(trimmed).toLowerCase();

  const { readDomains, cacheDomain, competitorId } = await resolveAdsCacheDomainForUser(
    supabase,
    userId,
    trimmed,
  );
  if (readDomains.length === 0) return null;

  const fetchCache = async (domains: string[]) => {
    const { data, error } = await supabase
      .from("ads_cache")
      .select("id, platform, ads_data, scraped_at, expires_at, competitor_domain")
      .eq("user_id", userId)
      .in("competitor_domain", domains);
    return { data, error };
  };

  let first = await fetchCache(readDomains);
  if (first.error) {
    console.warn("[ads-cache-read]", first.error.message);
    return null;
  }

  let cacheRows = first.data ?? [];
  if (cacheRows.length === 0) {
    const expanded = expandAdsCacheDomainCandidates(readDomains);
    const retry = await fetchCache(expanded);
    if (retry.error) {
      console.warn("[ads-cache-read] expanded", retry.error.message);
      return null;
    }
    cacheRows = retry.data ?? [];
  }

  if (cacheRows.length === 0 && cleaned) {
    const firstLabel = cleaned.includes(".") ? (cleaned.split(".")[0] ?? "") : cleaned;
    if (firstLabel.length >= 3) {
      const { data, error } = await supabase
        .from("ads_cache")
        .select("id, platform, ads_data, scraped_at, expires_at, competitor_domain")
        .eq("user_id", userId)
        .or(`competitor_domain.eq.${firstLabel},competitor_domain.ilike.${firstLabel}.%`);
      if (error) {
        console.warn("[ads-cache-read] label fallback", error.message);
      } else {
        cacheRows = data ?? [];
      }
    }
  }

  if (cacheRows.length === 0) return null;

  const latestByPlatform = pickBestAdsCacheRowMapByPlatform(
    cacheRows as AdsCachePickRow[],
    cacheDomain,
    new Date().toISOString(),
  );
  if (latestByPlatform.size === 0) return null;
  let response = adsLibraryResponseFromAdsCacheRows([...latestByPlatform.values()]);
  if (competitorId) {
    response = await supplementAdsLibraryFromScrapedAds(supabase, {
      userId,
      competitorId,
      response,
    });
  }
  return {
    response,
    pickedRows: [...latestByPlatform.values()],
    cacheDomain,
  };
}
