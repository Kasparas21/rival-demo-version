import { after } from "next/server";
import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { ALL_ADS_API_PLATFORMS, channelsQueryToAdsPlatforms } from "@/lib/ad-library/channels-to-platforms";
import {
  ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
  ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM,
  GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT,
} from "@/lib/ad-library/constants";
import { finalizeAdsLibraryAfterFreshScrape } from "@/lib/ad-library/finalize-ads-library-scrape";
import {
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import type { AdsLibraryIds } from "@/lib/ad-library/run-ads-library-parallel-scrape";
import { runAdsLibraryParallelScrape } from "@/lib/ad-library/run-ads-library-parallel-scrape";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
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

const MAX_ADS = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;
const DEFAULT_ADS = ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM;

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

function platformsFromSavedContext(adsLibraryContext: Database["public"]["Tables"]["saved_competitors"]["Row"]["ads_library_context"]): Set<AdsLibraryPlatform> {
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

function idsFromAdsContext(adsLibraryContext: Database["public"]["Tables"]["saved_competitors"]["Row"]["ads_library_context"]): AdsLibraryIds {
  if (adsLibraryContext == null || typeof adsLibraryContext !== "object" || Array.isArray(adsLibraryContext)) {
    return {};
  }
  const raw = (adsLibraryContext as { ids?: unknown }).ids;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === "string"),
  ) as AdsLibraryIds;
}

type FollowedSavedRow = Database["public"]["Tables"]["saved_competitors"]["Row"];

async function runWeeklyJobForRow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: FollowedSavedRow,
  weekStart: string,
  weekEnd: string
): Promise<void> {
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

    const { data: batchRow, error: batchErr } = await admin
      .from("scrape_batches")
      .insert({
        user_id: row.user_id,
        competitor_id: row.id,
        label: `Week of ${weekStart}`,
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
    const platformsRequested = platformsFromSavedContext(row.ads_library_context);
    const platformsNeedingScrape = new Set(platformsRequested);

    let pinterestAdvertiserNameForApify = "";
    if (platformsRequested.has("pinterest")) {
      pinterestAdvertiserNameForApify =
        extractPinterestHandleFromUrlOrString(ids.pinterest ?? "") ||
        extractPinterestHandleFromUrlOrString(ids.pinterestAdvertiserName ?? "") ||
        extractPinterestHandleFromUrlOrString(brandName);
      if (!pinterestAdvertiserNameForApify.trim()) {
        pinterestAdvertiserNameForApify = brandName;
      }
    }

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
    const metaMaxAds = Math.max(1, Math.min(DEFAULT_ADS, MAX_ADS));
    const metaCountry = "US";
    const metaSortBy = "impressions_desc";
    const linkedinMaxAds = Math.max(1, Math.min(DEFAULT_ADS, MAX_ADS));
    const linkedinDateRange = "past-week";
    const linkedinCountryCode = "";
    const tiktokMaxAds = Math.max(1, Math.min(DEFAULT_ADS, MAX_ADS));
    const microsoftMaxSearchResults = Math.max(24, Math.min(DEFAULT_ADS, MAX_ADS, 1000));
    const microsoftCountryCodes = microsoftMarketCodeToArray("66");
    const pinterestMaxResults = Math.max(1, Math.min(DEFAULT_ADS, MAX_ADS, 1000));
    const snapchatMaxItems = Math.max(10, Math.min(DEFAULT_ADS, 300));
    const snapchatCountryIso = "";
    const tiktokRegion = normalizeTikTokAdsRegion(undefined);
    const googleRegion = normalizeGoogleAdsRegion(undefined);
    const googleResultsLimit = normalizeGoogleAdsResultsLimit(undefined) || GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT;
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
      metaMaxAds,
      metaCountry,
      metaStartDate: weekStart,
      metaEndDate: weekEnd,
      metaSortBy,
      linkedinMaxAds,
      linkedinDateRange,
      linkedinCountryCode,
      tiktokMaxAds,
      tiktokStartDate: weekStart,
      tiktokEndDate: weekEnd,
      microsoftMaxSearchResults,
      microsoftCountryCodes,
      microsoftStartDate: weekStart,
      microsoftEndDate: weekEnd,
      pinterestMaxResults,
      pinterestStartDate: weekStart,
      pinterestEndDate: weekEnd,
      snapchatMaxItems,
      snapchatCountryIso,
      snapchatStartDate: weekStart,
      snapchatEndDate: weekEnd,
      tiktokRegion,
      googleRegion,
      googleResultsLimit,
      pinterestCountry,
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

/** POST — Vercel cron; Bearer CRON_SECRET. */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.APIFY_TOKEN?.trim()) {
    return Response.json({ error: "APIFY_TOKEN is not configured", processed: 0, succeeded: 0, failed: 0 }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  const { weekStart, weekEnd } = previousWeekMondaySundayUtc(new Date());

  const { data: followedRows, error: listErr } = await admin
    .from("saved_competitors")
    .select("*")
    .eq("is_followed", true);

  if (listErr || !followedRows) {
    console.error("[cron/weekly-scrape] list followers", listErr?.message ?? "unknown");
    return Response.json({ error: listErr?.message ?? "List failed", processed: 0, succeeded: 0, failed: 0 }, { status: 500 });
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  const chunkSize = 3;
  for (let i = 0; i < followedRows.length; i += chunkSize) {
    const chunk = followedRows.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (row) => {
        processed += 1;
        try {
          await runWeeklyJobForRow(admin, row, weekStart, weekEnd);
          succeeded += 1;
        } catch {
          failed += 1;
        }
      })
    );
  }

  return Response.json({ processed, succeeded, failed });
}
