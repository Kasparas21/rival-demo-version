import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorSlug, preferCanonicalSlug, slugsLikelySameCompany } from "@/lib/sidebar-competitors";

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

export type SavedCompetitorPickRow = Pick<
  Database["public"]["Tables"]["saved_competitors"]["Row"],
  "id" | "brand_domain" | "slug"
>;

/** When `.or()` matches both `slug.eq.nike` and `brand_domain.eq.nike.com`, prefer the FQDN / exact row. */
export function pickSavedCompetitorForDomainHint(
  rows: SavedCompetitorPickRow[] | null | undefined,
  cleaned: string
): SavedCompetitorPickRow | null {
  if (!rows?.length) return null;
  const norm = (s: string | null | undefined) => normalizeCompetitorSlug(String(s ?? "")).toLowerCase();
  const dotDepth = (h: string) => (h.match(/\./g) ?? []).length;

  const scored = rows.map((r) => {
    const bd = norm(r.brand_domain);
    const sg = norm(r.slug);
    let score = 0;
    if (bd === cleaned) score += 200;
    if (sg === cleaned) score += 190;
    if (bd && slugsLikelySameCompany(bd, cleaned)) score += 80;
    if (sg && slugsLikelySameCompany(sg, cleaned)) score += 70;
    const tieBreak = dotDepth(bd) * 10 + dotDepth(sg) + (bd.length + sg.length) * 0.001;
    return { r, score, tieBreak };
  });
  scored.sort((a, b) => b.score - a.score || b.tieBreak - a.tieBreak);
  const best = scored[0];
  if (!best || best.score < 1) return null;
  return best.r;
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

  const row = pickSavedCompetitorForDomainHint(rows, cleaned);
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

/**
 * Every `competitor_domain` value that may exist in `ads_cache` / `strategy_overview_cache` for this
 * saved competitor — mirrors {@link resolveAdsCacheDomainForUser} `readDomains` for all relevant lookup hints
 * (slug vs FQDN, request body cache domain, first-label variants like `apple` for `apple.com`).
 */
export function collectAdsCacheDomainVariantsForSavedCompetitorRow(
  row: { slug?: string | null; brand_domain?: string | null },
  bodyCacheDomain?: string | null
): string[] {
  const slugNorm = normalizeCompetitorSlug(String(row.slug ?? "")).toLowerCase();
  const brandNorm = row.brand_domain?.trim()
    ? normalizeCompetitorSlug(String(row.brand_domain)).toLowerCase()
    : "";

  const hintStrings = new Set<string>();
  if (row.slug?.trim()) hintStrings.add(row.slug.trim());
  if (row.brand_domain?.trim()) hintStrings.add(row.brand_domain.trim());
  if (bodyCacheDomain?.trim()) hintStrings.add(bodyCacheDomain.trim());

  for (const s of [...hintStrings]) {
    const h = normalizeCompetitorSlug(s).toLowerCase();
    if (h.includes(".")) {
      const first = h.split(".")[0] ?? "";
      if (first && first !== h) hintStrings.add(first);
    }
  }

  const domainSet = new Set<string>();
  if (slugNorm) domainSet.add(slugNorm);
  if (brandNorm) domainSet.add(brandNorm);

  for (const raw of hintStrings) {
    const cleaned = normalizeCompetitorSlug(raw).toLowerCase();
    const fallbackCache = cleaned || raw.trim().toLowerCase();
    const cacheDomain =
      preferCanonicalSlug(row.brand_domain ?? undefined, row.slug ?? undefined, cleaned)?.toLowerCase() ||
      slugNorm ||
      fallbackCache;

    for (const x of [cacheDomain, fallbackCache, cleaned, slugNorm, brandNorm]) {
      if (x && x.length) domainSet.add(x);
    }
  }

  return [...domainSet];
}
