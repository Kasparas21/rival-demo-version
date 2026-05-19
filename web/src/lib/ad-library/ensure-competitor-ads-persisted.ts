import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdsLibraryPlatform } from "./api-types";
import { resolveAdsCacheDomainForUser } from "./competitor-cache-domain";
import { countLibraryAdsForPlatform, platformScrapeSucceeded } from "./library-response-utils";
import { persistScrapedAdsFromAdsLibraryResponse } from "./persist-scraped-ads";
import {
  adsLibraryResponseFromAdsCacheRows,
  expandAdsCacheDomainCandidates,
} from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import type { Database } from "@/lib/supabase/types";

export type EnsureCompetitorAdsPersistedResult = {
  ok: boolean;
  competitorId: string | null;
  adsCachePlatforms: string[];
  scrapedAdsPersisted: number;
  errors: string[];
};

/**
 * After initial scrape, copy `ads_cache` → `scraped_ads` so reload / strategy see row-level data.
 * Safe to call multiple times (upserts).
 */
export async function ensureCompetitorAdsPersisted(
  supabase: SupabaseClient<Database>,
  params: { userId: string; domainHint: string }
): Promise<EnsureCompetitorAdsPersistedResult> {
  const { userId, domainHint } = params;
  const errors: string[] = [];

  const { competitorId, readDomains, cacheDomain } = await resolveAdsCacheDomainForUser(
    supabase,
    userId,
    domainHint
  );

  if (!competitorId) {
    return {
      ok: false,
      competitorId: null,
      adsCachePlatforms: [],
      scrapedAdsPersisted: 0,
      errors: ["competitor_not_found"],
    };
  }

  const domains = readDomains.length > 0 ? readDomains : expandAdsCacheDomainCandidates([cacheDomain]);
  const { data: cacheRows, error: cacheErr } = await supabase
    .from("ads_cache")
    .select("platform, ads_data, scraped_at, competitor_domain")
    .eq("user_id", userId)
    .in("competitor_domain", domains);

  if (cacheErr) {
    return {
      ok: false,
      competitorId,
      adsCachePlatforms: [],
      scrapedAdsPersisted: 0,
      errors: [cacheErr.message],
    };
  }

  const rows = cacheRows ?? [];
  if (rows.length === 0) {
    return {
      ok: false,
      competitorId,
      adsCachePlatforms: [],
      scrapedAdsPersisted: 0,
      errors: ["no_ads_cache_rows"],
    };
  }

  const latestByPlatform = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    const pl = row.platform;
    if (!pl) continue;
    const prev = latestByPlatform.get(pl);
    if (!prev || String(row.scraped_at) > String(prev.scraped_at)) {
      latestByPlatform.set(pl, row);
    }
  }

  const deduped = [...latestByPlatform.values()];
  const out = adsLibraryResponseFromAdsCacheRows(deduped);
  const platformsToPersist = new Set<AdsLibraryPlatform>();
  for (const row of deduped) {
    const p = row.platform as AdsLibraryPlatform;
    if (platformScrapeSucceeded(out, p) && countLibraryAdsForPlatform(p, out) > 0) {
      platformsToPersist.add(p);
    }
  }

  if (platformsToPersist.size === 0) {
    return {
      ok: false,
      competitorId,
      adsCachePlatforms: deduped.map((r) => r.platform),
      scrapedAdsPersisted: 0,
      errors: ["cache_rows_empty"],
    };
  }

  const nowIso = new Date().toISOString();
  const persistResult = await persistScrapedAdsFromAdsLibraryResponse(supabase, {
    userId,
    competitorId,
    domainNorm: cacheDomain,
    platformsToPersist,
    out,
    nowIso,
  });

  if (!persistResult.ok) {
    errors.push(...persistResult.errors);
  }

  return {
    ok: persistResult.ok,
    competitorId,
    adsCachePlatforms: deduped.map((r) => r.platform),
    scrapedAdsPersisted: persistResult.rowsInserted,
    errors,
  };
}
