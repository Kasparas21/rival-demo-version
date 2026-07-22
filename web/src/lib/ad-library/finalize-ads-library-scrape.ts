/**
 * Persist / ads_cache merge / quota / last_scraped — shared by POST /api/ads/library and weekly cron.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { ADS_CACHE_TTL_MS, CACHEABLE_PLATFORMS, type CacheablePlatform } from "@/lib/ad-library/cache-ttl";
import type { InitialScrapePlatform } from "@/lib/ad-library/constants";
import {
  pickBestAdsCacheHitsByPlatform,
  type AdsCachePickRow,
} from "@/lib/ad-library/ads-cache-pick";
import { mergeAdsCachePayloadForPlatform } from "@/lib/ad-library/ads-cache-merge";
import { savedCompetitorDomainOrFilter } from "@/lib/ad-library/competitor-cache-domain";
import {
  computePlatformsToPersist,
  countLibraryAdsForPlatform,
  persistScrapedAdsFromAdsLibraryResponse,
} from "@/lib/ad-library/persist-scraped-ads";
import { refreshPlatformTrackingAfterScrape } from "@/lib/ad-library/persist-platform-tracking";
import {
  applyMetaSweepToMergedCards,
  reconcileLifecycleAfterSweep,
  type SweepCaps,
} from "@/lib/ad-library/reconcile-lifecycle-after-sweep";
import type { MetaAdCard } from "@/lib/ad-library/normalize";
import { sanitizeJsonForPostgres } from "@/lib/json/sanitize-json-for-db";
import type { Database, Json } from "@/lib/supabase/types";

function isCacheablePlatform(p: AdsLibraryPlatform): p is CacheablePlatform {
  return (CACHEABLE_PLATFORMS as readonly string[]).includes(p);
}

function isInitialScrapePlatform(p: AdsLibraryPlatform): p is InitialScrapePlatform {
  return p !== "microsoft";
}

export async function finalizeAdsLibraryAfterFreshScrape(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    resolvedCompetitorId: string | null;
    domainNorm: string;
    adsCacheDomain: string;
    /** Slug/FQDN variants — used when merging so manual refresh cannot miss prior cache rows. */
    adsCacheReadDomains?: string[];
    platformsRequested: Set<AdsLibraryPlatform>;
    platformsNeedingScrape: Set<AdsLibraryPlatform>;
    out: AdsLibraryResponse;
    /** When set (e.g. weekly cron), `persistScrapedAdsFromAdsLibraryResponse` uses this batch instead of inserting. */
    scrapeBatchId?: string | null;
    /**
     * Requested per-platform caps for this scrape. When a platform's result count is
     * below its cap the sweep is exhaustive → absent ads get marked killed.
     */
    sweepCaps?: SweepCaps;
  }
): Promise<void> {
  const {
    userId,
    resolvedCompetitorId,
    domainNorm,
    adsCacheDomain,
    adsCacheReadDomains,
    platformsRequested,
    platformsNeedingScrape,
    out,
    scrapeBatchId,
    sweepCaps,
  } = params;

  /** Fresh Meta sweep results, captured before cache merge re-adds older cards. */
  const metaIncomingForSweep =
    platformsNeedingScrape.has("meta") && out.meta.error == null ? [...(out.meta.ads ?? [])] : null;

  if (userId && adsCacheDomain && platformsNeedingScrape.size > 0) {
    const cacheableToMerge = [...platformsNeedingScrape].filter(isCacheablePlatform);
    const readDomains = (
      adsCacheReadDomains?.length ? adsCacheReadDomains : [adsCacheDomain]
    ).filter(Boolean);
    if (cacheableToMerge.length > 0 && readDomains.length > 0) {
      const nowIso = new Date().toISOString();
      const { data: existingCacheRows } = await supabase
        .from("ads_cache")
        .select("platform, ads_data, competitor_domain, scraped_at, expires_at")
        .eq("user_id", userId)
        .in("competitor_domain", readDomains)
        .in("platform", cacheableToMerge);

      const prevByPl = pickBestAdsCacheHitsByPlatform(
        (existingCacheRows ?? []) as AdsCachePickRow[],
        adsCacheDomain,
        nowIso,
      );

      for (const p of cacheableToMerge) {
        const prev = prevByPl.get(p);
        const merged = mergeAdsCachePayloadForPlatform(p, prev, out);
        if (p === "meta") {
          const mergedMeta = merged as AdsLibraryResponse["meta"];
          if (metaIncomingForSweep && mergedMeta.error == null) {
            mergedMeta.ads = applyMetaSweepToMergedCards(
              (mergedMeta.ads ?? []) as MetaAdCard[],
              metaIncomingForSweep,
              sweepCaps?.meta ?? null,
            );
          }
          out.meta = mergedMeta;
        }
        if (p === "google") out.google = merged as AdsLibraryResponse["google"];
        if (p === "linkedin") out.linkedin = merged as AdsLibraryResponse["linkedin"];
        if (p === "tiktok") out.tiktok = merged as AdsLibraryResponse["tiktok"];
        if (p === "microsoft") out.microsoft = merged as AdsLibraryResponse["microsoft"];
        if (p === "pinterest") out.pinterest = merged as AdsLibraryResponse["pinterest"];
        if (p === "snapchat") out.snapchat = merged as AdsLibraryResponse["snapchat"];
      }
    }
  }

  const platformsToPersist =
    userId && resolvedCompetitorId
      ? await computePlatformsToPersist(supabase, {
          userId,
          competitorId: resolvedCompetitorId,
          platformsRequested,
          platformsNeedingScrape,
          out,
        })
      : new Set<AdsLibraryPlatform>();

  if (userId && adsCacheDomain && platformsToPersist.size > 0) {
    const nowPersist = new Date().toISOString();
    const persistResult = await persistScrapedAdsFromAdsLibraryResponse(supabase, {
      userId,
      competitorId: resolvedCompetitorId,
      domainNorm: adsCacheDomain,
      platformsToPersist,
      out,
      nowIso: nowPersist,
      scrapeBatchId: scrapeBatchId ?? undefined,
    });
    if (!persistResult.ok) {
      console.error(
        "[finalizeAdsLibrary] persist scraped_ads failed",
        persistResult.errors,
        "rowsInserted=",
        persistResult.rowsInserted
      );
    }
  }

  if (userId && resolvedCompetitorId && platformsNeedingScrape.size > 0) {
    const lastScrapedAt = new Date().toISOString();
    /**
     * Sweep reconciliation must see the raw scrape results, not the cache-merged
     * arrays — pass the pre-merge Meta ads captured above.
     */
    const outForReconcile: AdsLibraryResponse = metaIncomingForSweep
      ? { ...out, meta: { ads: metaIncomingForSweep, error: out.meta.error } }
      : out;
    try {
      await reconcileLifecycleAfterSweep(supabase, {
        userId,
        competitorId: resolvedCompetitorId,
        platformsScraped: [...platformsNeedingScrape].filter(
          (p): p is AdsLibraryPlatform => p === "meta" || p === "google" || p === "tiktok",
        ),
        out: outForReconcile,
        sweepCaps,
        lastScrapedAt,
      });
    } catch (reconcileErr) {
      console.error("[finalizeAdsLibrary] reconcileLifecycleAfterSweep", reconcileErr);
    }

    /** Copy new creatives into Supabase Storage before their CDN links expire. */
    const archiveParams = { userId, competitorId: resolvedCompetitorId };
    try {
      const { after } = await import("next/server");
      after(async () => {
        const { archiveAdCreativesForCompetitor } = await import("@/lib/ad-library/archive-ad-creatives");
        await archiveAdCreativesForCompetitor(archiveParams).catch((e) =>
          console.error("[finalizeAdsLibrary] archiveAdCreatives", e),
        );
      });
    } catch {
      const { archiveAdCreativesForCompetitor } = await import("@/lib/ad-library/archive-ad-creatives");
      void archiveAdCreativesForCompetitor(archiveParams).catch((e) =>
        console.error("[finalizeAdsLibrary] archiveAdCreatives", e),
      );
    }
  }

  if (userId && adsCacheDomain && platformsNeedingScrape.size > 0) {
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
      const adCount = countLibraryAdsForPlatform(p, out);
      if (adCount === 0) continue;
      const adsData: Json = sanitizeJsonForPostgres(
        (p === "meta"
          ? out.meta
          : p === "google"
            ? out.google
            : p === "linkedin"
              ? out.linkedin
              : p === "tiktok"
                ? out.tiktok
                : p === "microsoft"
                  ? out.microsoft
                  : p === "pinterest"
                    ? out.pinterest
                    : out.snapchat) as unknown
      );
      rows.push({
        user_id: userId,
        competitor_domain: adsCacheDomain,
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
        console.error("[finalizeAdsLibrary] ads_cache upsert", upsertError);
      } else {
        let adsScrapedDelta = 0;
        let scrapeOpsDelta = 0;
        for (const p of platformsNeedingScrape) {
          if (!isCacheablePlatform(p)) continue;
          scrapeOpsDelta += 1;
          adsScrapedDelta += countLibraryAdsForPlatform(p, out);
        }
        if (adsScrapedDelta > 0 || scrapeOpsDelta > 0) {
          const { error: usageErr } = await supabase.rpc("increment_monthly_scrape_usage", {
            p_ads_count: adsScrapedDelta,
            p_ops_count: scrapeOpsDelta,
          });
          if (usageErr) {
            console.error("[finalizeAdsLibrary] increment_monthly_scrape_usage", usageErr);
          }
        }
        const scrapeOr = savedCompetitorDomainOrFilter(domainNorm);
        const lastScrapedQuery = supabase
          .from("saved_competitors")
          .update({ last_scraped_at: now })
          .eq("user_id", userId);
        const { error: lastScrapedError } =
          scrapeOr.length > 0
            ? await lastScrapedQuery.or(scrapeOr)
            : await lastScrapedQuery.eq("brand_domain", domainNorm);
        if (lastScrapedError) {
          console.error("[finalizeAdsLibrary] last_scraped_at update", lastScrapedError);
        }
        if (resolvedCompetitorId) {
          const platformsScraped = [...platformsNeedingScrape].filter(isInitialScrapePlatform);
          if (platformsScraped.length > 0) {
            try {
              await refreshPlatformTrackingAfterScrape(supabase, {
                userId,
                competitorId: resolvedCompetitorId,
                platformsScraped,
                nowIso: now,
              });
            } catch (trackingErr) {
              console.error("[finalizeAdsLibrary] refreshPlatformTrackingAfterScrape", trackingErr);
            }
          }
        }
      }
    }
  }

  if (userId && resolvedCompetitorId && scrapeBatchId) {
    try {
      const { runAgentAfterAdsScrape } = await import("@/lib/agent/fetch-scrape-deltas");
      await runAgentAfterAdsScrape(supabase, {
        userId,
        competitorId: resolvedCompetitorId,
        scrapeBatchId,
      });
    } catch (agentErr) {
      console.error("[finalizeAdsLibrary] rival-agent", agentErr);
    }

    try {
      const { data: competitor } = await supabase
        .from("saved_competitors")
        .select("brand_domain, slug")
        .eq("id", resolvedCompetitorId)
        .maybeSingle();
      const website = competitor?.brand_domain?.trim() || competitor?.slug?.trim();
      if (website) {
        const { syncLandingPagesFromCompetitorAds } = await import(
          "@/lib/landing-page-tracker/sync-landing-pages-from-ads"
        );
        await syncLandingPagesFromCompetitorAds(supabase, resolvedCompetitorId, userId, website);
      }
    } catch (landingErr) {
      console.error("[finalizeAdsLibrary] auto-detect landing pages", landingErr);
    }
  }
}
