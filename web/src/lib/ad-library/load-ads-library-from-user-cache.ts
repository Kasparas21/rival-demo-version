import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { pickBestAdsCacheRowMapByPlatform, type AdsCachePickRow } from "@/lib/ad-library/ads-cache-pick";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import {
  adsLibraryResponseFromAdsCacheRows,
  expandAdsCacheDomainCandidates,
} from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import type { Database } from "@/lib/supabase/types";

/**
 * Best-effort merge of the user's latest `ads_cache` rows for a competitor/workspace domain hint.
 * Does not enforce TTL — prioritizes grounding the coach view over freshness.
 */
export async function fetchLatestAdsLibraryFromUserCache(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string,
): Promise<AdsLibraryResponse | null> {
  const trimmed = domainHint.trim();
  if (!trimmed) return null;

  const { readDomains, cacheDomain } = await resolveAdsCacheDomainForUser(supabase, userId, trimmed);
  if (readDomains.length === 0) return null;

  const fetchCache = async (domains: string[]) => {
    const { data, error } = await supabase
      .from("ads_cache")
      .select("platform, ads_data, scraped_at, expires_at, competitor_domain")
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

  if (cacheRows.length === 0) return null;

  const latestByPlatform = pickBestAdsCacheRowMapByPlatform(
    cacheRows as AdsCachePickRow[],
    cacheDomain,
    new Date().toISOString(),
  );
  if (latestByPlatform.size === 0) return null;
  return adsLibraryResponseFromAdsCacheRows([...latestByPlatform.values()]);
}
