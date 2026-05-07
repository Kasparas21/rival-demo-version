import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorSlug, preferCanonicalSlug } from "@/lib/sidebar-competitors";

/** PostgREST `or=` for matching a saved competitor by `brand_domain` or `slug`. */
export function savedCompetitorDomainOrFilter(domainHint: string): string {
  const host = normalizeCompetitorSlug(domainHint.trim()).toLowerCase();
  const clauses = new Set<string>();
  if (host) {
    clauses.add(`brand_domain.eq.${host}`);
    clauses.add(`slug.eq.${host}`);
    const firstLabel = host.includes(".") ? (host.split(".")[0] ?? "") : "";
    if (firstLabel && firstLabel !== host) clauses.add(`slug.eq.${firstLabel}`);
  }
  return [...clauses].join(",");
}

/**
 * Canonical `ads_cache.competitor_domain` for this request: aligns with stored `saved_competitors`
 * so reads/writes match when slug vs domain differ (e.g. `nordvpn` vs `nordvpn.com`).
 */
export async function resolveAdsCacheDomainForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string
): Promise<{ competitorId: string | null; cacheDomain: string; readDomains: string[] }> {
  const cleaned = normalizeCompetitorSlug(domainHint.trim()).toLowerCase();
  const fallbackCache = cleaned || domainHint.trim().toLowerCase();
  const orFilter = savedCompetitorDomainOrFilter(domainHint);
  if (!cleaned || !orFilter) {
    return { competitorId: null, cacheDomain: fallbackCache, readDomains: [fallbackCache] };
  }

  let q = supabase
    .from("saved_competitors")
    .select("id, brand_domain, slug")
    .eq("user_id", userId);

  const { data: rows, error } = await q.or(orFilter);
  if (error) {
    console.error("[ads-cache-domain] saved_competitors lookup", error);
    const readDomains = Array.from(new Set([fallbackCache, cleaned].filter(Boolean)));
    return { competitorId: null, cacheDomain: fallbackCache, readDomains };
  }

  const row = rows?.[0];
  if (!row?.id) {
    const readDomains = Array.from(new Set([fallbackCache, cleaned].filter(Boolean)));
    return { competitorId: null, cacheDomain: fallbackCache, readDomains };
  }

  const slugNorm = normalizeCompetitorSlug(String(row.slug ?? "")).toLowerCase();
  const cacheDomain =
    preferCanonicalSlug(row.brand_domain ?? undefined, row.slug, cleaned)?.toLowerCase() ||
    slugNorm ||
    fallbackCache;

  const readDomains = Array.from(
    new Set([cacheDomain, fallbackCache, cleaned, slugNorm].filter((x) => Boolean(x && x.length)))
  );

  return { competitorId: row.id, cacheDomain, readDomains };
}
