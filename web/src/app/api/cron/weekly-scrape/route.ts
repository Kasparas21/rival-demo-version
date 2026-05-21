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
  platformsEligibleForScheduledScrape,
  type PlatformClassification,
} from "@/lib/ad-library/platform-prioritization";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { refreshPlatformTrackingAfterScrape } from "@/lib/ad-library/persist-platform-tracking";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import {
  computeScheduledScrapeDateWindow,
  linkedinDateRangeForWindow,
  msToUtcYmd,
} from "@/lib/ad-library/scheduled-scrape-date-window";
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

function isWithinRefreshWindowUtc(now = new Date()): boolean {
  const hour = now.getUTCHours();
  return hour >= 4 && hour < 7;
}

function isMondayUtc(now = new Date()): boolean {
  return now.getUTCDay() === 1;
}

async function userAllowsAutoRefresh(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<boolean> {
  const billing = await getBillingEntitlement(admin, userId);
  if (billing.planTier === "free_trial") return false;
  return billing.limits.allowAutoRefresh || billing.isUnlimited;
}

async function runWeeklyJobForRow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: FollowedSavedRow,
  runDayYmd: string
): Promise<{ skipped: boolean }> {
  if (row.is_workspace_brand && !isMondayUtc()) {
    return { skipped: true };
  }

  if (!(await userAllowsAutoRefresh(admin, row.user_id))) {
    return { skipped: true };
  }

  const nowStamp = new Date().toISOString();
  const nowMs = Date.parse(nowStamp);
  let jobRowId: string | null = null;

  try {
    const { data: jobCreated, error: jobInsErr } = await admin
      .from("weekly_scrape_jobs")
      .insert({
        user_id: row.user_id,
        competitor_id: row.id,
        week_start: runDayYmd,
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

    const { data: competitorAnchor } = await admin
      .from("saved_competitors")
      .select("first_scrape_completed_at")
      .eq("id", row.id)
      .maybeSingle();

    const firstScrapeAt = competitorAnchor?.first_scrape_completed_at ?? null;

    let { data: trackingRows } = await admin
      .from("competitor_platform_tracking")
      .select("platform, classification, next_scrape_at, last_scrape_at, high_coverage_demoted")
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
        .select("platform, classification, next_scrape_at, last_scrape_at, high_coverage_demoted")
        .eq("competitor_id", row.id);
      trackingRows = reload.data ?? [];
    }

    const trackingForConfigured = (trackingRows ?? []).filter((r) =>
      configuredInitial.includes(r.platform as InitialScrapePlatform)
    );

    const spDisabled = row.smart_prioritization_disabled === true;
    const duePlatforms = platformsEligibleForScheduledScrape(
      trackingForConfigured.map((r) => ({
        platform: r.platform,
        classification: r.classification as PlatformClassification,
        next_scrape_at: r.next_scrape_at,
        high_coverage_demoted: r.high_coverage_demoted,
      })),
      spDisabled,
      nowMs,
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

    const lastScrapeByPlatform = new Map(
      trackingForConfigured.map((r) => [r.platform as InitialScrapePlatform, r.last_scrape_at])
    );

    const { data: batchRow, error: batchErr } = await admin
      .from("scrape_batches")
      .insert({
        user_id: row.user_id,
        competitor_id: row.id,
        label: `Scheduled ${runDayYmd}`,
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

    const fromPinterestIds =
      extractPinterestHandleFromUrlOrString(ids.pinterest ?? "") ||
      extractPinterestHandleFromUrlOrString(ids.pinterestAdvertiserName ?? "") ||
      "";
    const pinterestConfirmedAdvertiserQuery = fromPinterestIds.trim()
      ? fromPinterestIds.trim()
      : undefined;
    let pinterestAdvertiserNameForApify =
      fromPinterestIds.trim() || extractPinterestHandleFromUrlOrString(brandName);
    if (!pinterestAdvertiserNameForApify.trim()) {
      pinterestAdvertiserNameForApify = brandName;
    }

    const snapchatConfirmedAdvertiserQuery =
      typeof ids.snapchat === "string" && ids.snapchat.trim() ? ids.snapchat.trim() : undefined;

    const resolved = await resolveAdsCacheDomainForUser(admin, row.user_id, domainNorm.toLowerCase());
    const resolvedCompetitorId = resolved.competitorId ?? row.id;
    const adsCacheDomain = resolved.cacheDomain || domainNorm.toLowerCase();
    const adsCacheReadDomains = resolved.readDomains?.length
      ? resolved.readDomains
      : [adsCacheDomain];
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
    const microsoftCountryCodes = microsoftMarketCodeToArray("66");
    const snapchatCountryIso = "";
    const tiktokRegion = normalizeTikTokAdsRegion(undefined);
    const googleRegion = normalizeGoogleAdsRegion(undefined);
    const pinterestCountry = normalizePinterestAdsCountry(undefined);

    for (const platform of platformsToScrape) {
      const classification = classificationByPlatform.get(platform) ?? "SECONDARY";
      const isInactiveProbe = classification === "INACTIVE";
      const lim = buildScheduledScrapeLimits(classification, { isInactiveProbe });
      const lastScrapeAt =
        lastScrapeByPlatform.get(platform) ?? firstScrapeAt ?? nowStamp;
      const dateWindow = computeScheduledScrapeDateWindow(lastScrapeAt, nowMs);
      const linkedinDateRange = linkedinDateRangeForWindow(dateWindow, {
        inactiveProbe: isInactiveProbe,
      });

      const platformsNeedingScrape = new Set<AdsLibraryPlatform>([platform]);

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
        metaMaxAds: lim.metaMaxAds,
        metaCountry,
        metaStartDate: dateWindow.startYmd,
        metaEndDate: dateWindow.endYmd,
        metaSortBy,
        linkedinMaxAds: lim.linkedinMaxAds,
        linkedinDateRange,
        linkedinCountryCode,
        tiktokMaxAds: lim.tiktokMaxAds,
        tiktokStartDate: dateWindow.startYmd,
        tiktokEndDate: dateWindow.endYmd,
        microsoftMaxSearchResults: Math.max(24, lim.metaMaxAds, 1000),
        microsoftCountryCodes,
        microsoftStartDate: dateWindow.startYmd,
        microsoftEndDate: dateWindow.endYmd,
        pinterestMaxResults: lim.pinterestMaxResults,
        pinterestStartDate: dateWindow.startYmd,
        pinterestEndDate: dateWindow.endYmd,
        snapchatMaxItems: lim.snapchatMaxItems,
        snapchatCountryIso,
        snapchatStartDate: dateWindow.startYmd,
        snapchatEndDate: dateWindow.endYmd,
        tiktokRegion,
        googleRegion,
        googleResultsLimit: normalizeGoogleAdsResultsLimit(lim.googleResultsLimit),
        pinterestCountry,
        pinterestConfirmedAdvertiserQuery,
        snapchatConfirmedAdvertiserQuery,
      });
    }

    const platformsNeedingScrape = new Set<AdsLibraryPlatform>(platformsToScrape);

    await finalizeAdsLibraryAfterFreshScrape(admin, {
      userId: row.user_id,
      resolvedCompetitorId,
      domainNorm: domainNormLower,
      adsCacheDomain,
      adsCacheReadDomains,
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

  if (!isWithinRefreshWindowUtc()) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "outside_refresh_window",
      message: "Scheduled refresh only runs 04:00–07:00 UTC",
      processed: 0,
      succeeded: 0,
      failed: 0,
    });
  }

  if (!process.env.APIFY_TOKEN?.trim()) {
    return Response.json(
      { error: "APIFY_TOKEN is not configured", processed: 0, succeeded: 0, failed: 0, skipped: 0 },
      { status: 503 }
    );
  }

  const admin = createSupabaseAdminClient();
  const runDayYmd = msToUtcYmd(Date.now());

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
          const result = await runWeeklyJobForRow(admin, row, runDayYmd);
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
