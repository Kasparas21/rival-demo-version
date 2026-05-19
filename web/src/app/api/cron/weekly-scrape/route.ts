import { after } from "next/server";
import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { ALL_ADS_API_PLATFORMS, channelsQueryToAdsPlatforms } from "@/lib/ad-library/channels-to-platforms";
import { classifyCompetitorPlatforms } from "@/lib/ad-library/classify-competitor-platforms";
import { buildScheduledScrapeLimits } from "@/lib/ad-library/build-scheduled-scrape-params";
import type { InitialScrapePlatform } from "@/lib/ad-library/constants";
import { finalizeAdsLibraryAfterFreshScrape } from "@/lib/ad-library/finalize-ads-library-scrape";
import {
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import type { AdsLibraryIds } from "@/lib/ad-library/run-ads-library-parallel-scrape";
import { runAdsLibraryParallelScrape } from "@/lib/ad-library/run-ads-library-parallel-scrape";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import {
  platformsDueForScrape,
  type PlatformClassification,
} from "@/lib/ad-library/platform-prioritization";
import { refreshPlatformTrackingAfterScrape } from "@/lib/ad-library/persist-platform-tracking";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import { microsoftMarketCodeToArray } from "@/lib/ad-library/scrape-settings-options";
import { normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import { hostToBrandLabel } from "@/lib/onboarding/host";
import { recomputeStrategyOverviewForCompetitor } from "@/lib/strategy-overview/recompute-strategy-overview";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

export const runtime = "nodejs";
export const maxDuration = 300;

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || d;
}

/** Previous ISO week Monday–Sunday in UTC (`YYYY-MM-DD`). */
function previousWeekMondaySundayUtc(reference = new Date()): { weekStart: string; weekEnd: string } {
  const d = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const dow = d.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const thisMonday = new Date(d);
  thisMonday.setUTCDate(d.getUTCDate() + mondayOffset);
  const prevMonday = new Date(thisMonday);
  prevMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setUTCDate(prevMonday.getUTCDate() + 6);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { weekStart: iso(prevMonday), weekEnd: iso(prevSunday) };
}

function platformsFromSavedContext(
  adsLibraryContext: Database["public"]["Tables"]["saved_competitors"]["Row"]["ads_library_context"]
): Set<AdsLibraryPlatform> {
  if (adsLibraryContext == null || typeof adsLibraryContext !== "object" || Array.isArray(adsLibraryContext)) {
    return new Set(ALL_ADS_API_PLATFORMS);
  }
  const ch = (adsLibraryContext as { channels?: unknown }).channels;
  if (!Array.isArray(ch) || ch.length === 0) {
    return new Set(ALL_ADS_API_PLATFORMS);
  }
  const channels = ch.filter((c): c is string => typeof c === "string" && c.trim() !== "");
  if (channels.length === 0) return new Set(ALL_ADS_API_PLATFORMS);
  return new Set(channelsQueryToAdsPlatforms(channels));
}

function idsFromAdsContext(
  adsLibraryContext: Database["public"]["Tables"]["saved_competitors"]["Row"]["ads_library_context"]
): AdsLibraryIds {
  if (adsLibraryContext == null || typeof adsLibraryContext !== "object" || Array.isArray(adsLibraryContext)) {
    return {};
  }
  const raw = (adsLibraryContext as { ids?: unknown }).ids;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === "string")
  ) as AdsLibraryIds;
}

type FollowedSavedRow = Database["public"]["Tables"]["saved_competitors"]["Row"];

function mergeScheduledLimits(
  platforms: InitialScrapePlatform[],
  classificationByPlatform: Map<string, PlatformClassification>
) {
  let metaMaxAds = 0;
  let googleResultsLimit = 0;
  let linkedinMaxAds = 0;
  let tiktokMaxAds = 0;
  let pinterestMaxResults = 0;
  let snapchatMaxItems = 10;
  let anyInactiveProbe = false;

  for (const p of platforms) {
    const classification = classificationByPlatform.get(p) ?? "SECONDARY";
    const lim = buildScheduledScrapeLimits(classification, {
      isInactiveProbe: classification === "INACTIVE",
    });
    metaMaxAds = Math.max(metaMaxAds, lim.metaMaxAds);
    googleResultsLimit = Math.max(googleResultsLimit, lim.googleResultsLimit);
    linkedinMaxAds = Math.max(linkedinMaxAds, lim.linkedinMaxAds);
    tiktokMaxAds = Math.max(tiktokMaxAds, lim.tiktokMaxAds);
    pinterestMaxResults = Math.max(pinterestMaxResults, lim.pinterestMaxResults);
    snapchatMaxItems = Math.max(snapchatMaxItems, lim.snapchatMaxItems);
    if (lim.isInactiveProbe) anyInactiveProbe = true;
  }

  return {
    metaMaxAds: metaMaxAds || 100,
    googleResultsLimit: googleResultsLimit || 100,
    linkedinMaxAds: linkedinMaxAds || 100,
    tiktokMaxAds: tiktokMaxAds || 100,
    pinterestMaxResults: pinterestMaxResults || 100,
    snapchatMaxItems,
    anyInactiveProbe,
  };
}

async function runWeeklyJobForRow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: FollowedSavedRow,
  weekStart: string,
  weekEnd: string
): Promise<{ skipped: boolean }> {
  const nowStamp = new Date().toISOString();
  let jobRowId: string | null = null;

  try {
    const { data: jobCreated, error: jobInsErr } = await admin
      .from("weekly_scrape_jobs")
      .insert({
        user_id: row.user_id,
        competitor_id: row.id,
        week_start: weekStart,
        status: "running",
        updated_at: nowStamp,
      })
      .select("id")
      .single();

    if (jobInsErr || !jobCreated?.id) {
      console.error("[cron/weekly-scrape] weekly_scrape_jobs insert", jobInsErr?.message ?? "no row");
      throw jobInsErr ?? new Error("weekly_scrape_jobs insert failed");
    }
    jobRowId = jobCreated.id;

    const configuredPlatforms = platformsFromSavedContext(row.ads_library_context);
    const configuredInitial = [...configuredPlatforms].filter(
      (p): p is InitialScrapePlatform => p !== "microsoft"
    );

    let { data: trackingRows } = await admin
      .from("competitor_platform_tracking")
      .select("platform, classification, next_scrape_at")
      .eq("competitor_id", row.id);

    if (!trackingRows?.length) {
      try {
        await classifyCompetitorPlatforms(admin, {
          userId: row.user_id,
          competitorId: row.id,
        });
      } catch (e) {
        console.warn("[cron/weekly-scrape] bootstrap classify", e);
      }
      const reload = await admin
        .from("competitor_platform_tracking")
        .select("platform, classification, next_scrape_at")
        .eq("competitor_id", row.id);
      trackingRows = reload.data ?? [];
    }

    const trackingForConfigured = (trackingRows ?? []).filter((r) =>
      configuredInitial.includes(r.platform as InitialScrapePlatform)
    );

    const duePlatforms = platformsDueForScrape(
      trackingForConfigured.map((r) => ({
        platform: r.platform,
        classification: r.classification as PlatformClassification,
        next_scrape_at: r.next_scrape_at,
      }))
    );
    const platformsToScrape =
      duePlatforms.length > 0
        ? duePlatforms.filter((p) => configuredPlatforms.has(p))
        : configuredInitial.filter((p) => !trackingForConfigured.some((t) => t.platform === p));

    if (platformsToScrape.length === 0) {
      await admin
        .from("weekly_scrape_jobs")
        .update({
          status: "done",
          error_text: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobRowId);
      return { skipped: true };
    }

    const classificationByPlatform = new Map(
      trackingForConfigured.map((r) => [r.platform, r.classification as PlatformClassification])
    );

    const limits = mergeScheduledLimits(platformsToScrape, classificationByPlatform);
    const linkedinDateRange = limits.anyInactiveProbe ? "past-month" : "past-week";

    const { data: batchRow, error: batchErr } = await admin
      .from("scrape_batches")
      .insert({
        user_id: row.user_id,
        competitor_id: row.id,
        label: `Scheduled ${weekStart}`,
      })
      .select("id")
      .single();

    if (batchErr || !batchRow?.id) {
      console.error("[cron/weekly-scrape] scrape_batches insert", batchErr?.message);
      throw batchErr ?? new Error("scrape_batches insert failed");
    }
    const batchId = batchRow.id;

    const { error: jobLinkErr } = await admin
      .from("weekly_scrape_jobs")
      .update({ scrape_batch_id: batchId, updated_at: new Date().toISOString() })
      .eq("id", jobRowId);
    if (jobLinkErr) {
      console.error("[cron/weekly-scrape] weekly_scrape_jobs link batch", jobLinkErr.message);
    }

    const domainNorm = cleanDomain(row.brand_domain || row.slug || "");
    const brandName =
      row.brand_name?.trim() || row.name?.trim() || normalizeCompetitorSlug(row.slug) || "Competitor";
    const linkedinKeywordFallback = domainNorm ? hostToBrandLabel(domainNorm) : undefined;
    const ids = idsFromAdsContext(row.ads_library_context);
    const platformsRequested = new Set(configuredPlatforms);
    const platformsNeedingScrape = new Set<AdsLibraryPlatform>(platformsToScrape);

    let pinterestAdvertiserNameForApify = "";
    let pinterestConfirmedAdvertiserQuery: string | undefined;
    if (platformsNeedingScrape.has("pinterest")) {
      const fromPinterestIds =
        extractPinterestHandleFromUrlOrString(ids.pinterest ?? "") ||
        extractPinterestHandleFromUrlOrString(ids.pinterestAdvertiserName ?? "") ||
        "";
      if (fromPinterestIds.trim()) {
        pinterestConfirmedAdvertiserQuery = fromPinterestIds.trim();
      }
      pinterestAdvertiserNameForApify =
        fromPinterestIds.trim() || extractPinterestHandleFromUrlOrString(brandName);
      if (!pinterestAdvertiserNameForApify.trim()) {
        pinterestAdvertiserNameForApify = brandName;
      }
    }

    const snapchatConfirmedAdvertiserQuery =
      typeof ids.snapchat === "string" && ids.snapchat.trim() ? ids.snapchat.trim() : undefined;

    const resolved = await resolveAdsCacheDomainForUser(admin, row.user_id, domainNorm.toLowerCase());
    const resolvedCompetitorId = resolved.competitorId ?? row.id;
    const adsCacheDomain = resolved.cacheDomain || domainNorm.toLowerCase();
    const domainNormLower = domainNorm.toLowerCase();

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

    const metaStatus = "ACTIVE";
    const metaCountry = "US";
    const metaSortBy = "impressions_desc";
    const linkedinCountryCode = "";
    const microsoftMaxSearchResults = Math.max(24, limits.metaMaxAds, 1000);
    const microsoftCountryCodes = microsoftMarketCodeToArray("66");
    const snapchatCountryIso = "";
    const tiktokRegion = normalizeTikTokAdsRegion(undefined);
    const googleRegion = normalizeGoogleAdsRegion(undefined);
    const googleResultsLimit = normalizeGoogleAdsResultsLimit(limits.googleResultsLimit);
    const pinterestCountry = normalizePinterestAdsCountry(undefined);

    await runAdsLibraryParallelScrape({
      ids,
      brandName,
      domain: domainNormLower,
      linkedinKeywordFallback,
      pinterestAdvertiserNameForApify,
      platformsRequested,
      platformsNeedingScrape,
      out,
      metaStatus,
      metaMaxAds: limits.metaMaxAds,
      metaCountry,
      metaStartDate: weekStart,
      metaEndDate: weekEnd,
      metaSortBy,
      linkedinMaxAds: limits.linkedinMaxAds,
      linkedinDateRange,
      linkedinCountryCode,
      tiktokMaxAds: limits.tiktokMaxAds,
      tiktokStartDate: weekStart,
      tiktokEndDate: weekEnd,
      microsoftMaxSearchResults,
      microsoftCountryCodes,
      microsoftStartDate: weekStart,
      microsoftEndDate: weekEnd,
      pinterestMaxResults: limits.pinterestMaxResults,
      pinterestStartDate: weekStart,
      pinterestEndDate: weekEnd,
      snapchatMaxItems: limits.snapchatMaxItems,
      snapchatCountryIso,
      snapchatStartDate: weekStart,
      snapchatEndDate: weekEnd,
      tiktokRegion,
      googleRegion,
      googleResultsLimit,
      pinterestCountry,
      pinterestConfirmedAdvertiserQuery,
      snapchatConfirmedAdvertiserQuery,
    });

    await finalizeAdsLibraryAfterFreshScrape(admin, {
      userId: row.user_id,
      resolvedCompetitorId,
      domainNorm: domainNormLower,
      adsCacheDomain,
      platformsRequested,
      platformsNeedingScrape,
      out,
      scrapeBatchId: batchId,
    });

    await refreshPlatformTrackingAfterScrape(admin, {
      userId: row.user_id,
      competitorId: row.id,
      platformsScraped: platformsToScrape,
    });

    const { error: doneErr } = await admin
      .from("weekly_scrape_jobs")
      .update({
        status: "done",
        scrape_batch_id: batchId,
        error_text: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobRowId);
    if (doneErr) {
      console.error("[cron/weekly-scrape] weekly_scrape_jobs done", doneErr.message);
    }

    const userIdSnap = row.user_id;
    const competitorIdSnap = row.id;

    after(() => {
      const sb = createSupabaseAdminClient();
      void recomputeStrategyOverviewForCompetitor({
        supabase: sb,
        userId: userIdSnap,
        competitorId: competitorIdSnap,
        domainHint: domainNormLower,
      }).then((r) => {
        if (!r.ok) console.warn("[cron/weekly-scrape] strategy overview recompute:", r.error);
      });
    });

    return { skipped: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (jobRowId) {
      const { error: failErr } = await admin
        .from("weekly_scrape_jobs")
        .update({
          status: "failed",
          error_text: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobRowId);
      if (failErr) console.error("[cron/weekly-scrape] weekly_scrape_jobs failed", failErr.message);
    }
    throw e;
  }
}

/** POST — Vercel cron; Bearer CRON_SECRET. Daily cadence for Smart Prioritization refresh. */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.APIFY_TOKEN?.trim()) {
    return Response.json(
      { error: "APIFY_TOKEN is not configured", processed: 0, succeeded: 0, failed: 0, skipped: 0 },
      { status: 503 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { weekStart, weekEnd } = previousWeekMondaySundayUtc(new Date());

  const { data: followedRows, error: listErr } = await admin
    .from("saved_competitors")
    .select("*")
    .eq("is_followed", true);

  if (listErr || !followedRows) {
    console.error("[cron/weekly-scrape] list followers", listErr?.message ?? "unknown");
    return Response.json(
      { error: listErr?.message ?? "List failed", processed: 0, succeeded: 0, failed: 0, skipped: 0 },
      { status: 500 }
    );
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  const chunkSize = 3;
  for (let i = 0; i < followedRows.length; i += chunkSize) {
    const chunk = followedRows.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (row) => {
        processed += 1;
        try {
          const result = await runWeeklyJobForRow(admin, row, weekStart, weekEnd);
          if (result.skipped) skipped += 1;
          else succeeded += 1;
        } catch {
          failed += 1;
        }
      })
    );
  }

  return Response.json({ processed, succeeded, failed, skipped });
}
