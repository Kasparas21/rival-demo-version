import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsCacheMetadataRow } from "@/lib/ad-library/ads-cache-hydrate-meta";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import { expandAdsCacheDomainCandidates } from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import type { Database } from "@/lib/supabase/types";

const METADATA_SELECT = "id, platform, scraped_at, expires_at, competitor_domain";

/**
 * Lightweight `ads_cache` read — timestamp/id columns only (no `ads_data` jsonb).
 * Mirrors domain resolution in {@link fetchLatestAdsLibraryFromUserCache}.
 */
export async function fetchAdsCacheMetadataForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string,
): Promise<{ cacheDomain: string; rows: AdsCacheMetadataRow[] } | null> {
  const trimmed = domainHint.trim();
  if (!trimmed) return null;
  const cleaned = normalizeCompetitorSlug(trimmed).toLowerCase();

  const { readDomains, cacheDomain } = await resolveAdsCacheDomainForUser(supabase, userId, trimmed);
  if (readDomains.length === 0) return null;

  const fetchMeta = async (domains: string[]) => {
    const { data, error } = await supabase
      .from("ads_cache")
      .select(METADATA_SELECT)
      .eq("user_id", userId)
      .in("competitor_domain", domains);
    return { data, error };
  };

  let first = await fetchMeta(readDomains);
  if (first.error) {
    console.warn("[ads-cache-meta]", first.error.message);
    return null;
  }

  let rows = (first.data ?? []) as AdsCacheMetadataRow[];
  if (rows.length === 0) {
    const expanded = expandAdsCacheDomainCandidates(readDomains);
    if (expanded.length > readDomains.length) {
      const retry = await fetchMeta(expanded);
      if (retry.error) {
        console.warn("[ads-cache-meta] expanded", retry.error.message);
        return null;
      }
      rows = (retry.data ?? []) as AdsCacheMetadataRow[];
    }
  }

  if (rows.length === 0 && cleaned) {
    const firstLabel = cleaned.includes(".") ? (cleaned.split(".")[0] ?? "") : cleaned;
    if (firstLabel.length >= 3) {
      const { data, error } = await supabase
        .from("ads_cache")
        .select(METADATA_SELECT)
        .eq("user_id", userId)
        .or(`competitor_domain.eq.${firstLabel},competitor_domain.ilike.${firstLabel}.%`);
      if (error) {
        console.warn("[ads-cache-meta] label fallback", error.message);
      } else {
        rows = (data ?? []) as AdsCacheMetadataRow[];
      }
    }
  }

  if (rows.length === 0) return null;
  return { cacheDomain, rows };
}
