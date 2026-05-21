import type { SupabaseClient } from "@supabase/supabase-js";
import type { InitialScrapePlatform } from "./constants";
import type { ActiveAdCounts } from "./count-active-ads";
import {
  computeNextScrapeAt,
  computePlatformTracking,
  isClassificationReviewDue,
  reclassifyPlatform,
  type PlatformClassification,
  type PlatformTrackingResult,
} from "./platform-prioritization";
import type { Database } from "@/lib/supabase/types";

export type PlatformTrackingRow = {
  platform: InitialScrapePlatform;
  classification: PlatformClassification;
  activeAdCount: number;
  highCoverageDemoted: boolean;
  classifiedAt: string;
  lastClassificationReviewAt: string;
  lastScrapeAt: string;
  nextScrapeAt: string;
};

export async function persistPlatformTracking(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    activeCounts: ActiveAdCounts;
    highCoverageApplied: boolean;
    nowIso?: string;
  }
): Promise<PlatformTrackingRow[]> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const { platforms } = computePlatformTracking(params.activeCounts);

  const { data: competitorRow } = await supabase
    .from("saved_competitors")
    .select("first_scrape_completed_at")
    .eq("id", params.competitorId)
    .eq("user_id", params.userId)
    .maybeSingle();

  const competitorUpdate: Database["public"]["Tables"]["saved_competitors"]["Update"] = {
    updated_at: nowIso,
  };
  if (!competitorRow?.first_scrape_completed_at) {
    competitorUpdate.first_scrape_completed_at = nowIso;
  }

  const { error: competitorErr } = await supabase
    .from("saved_competitors")
    .update(competitorUpdate)
    .eq("id", params.competitorId)
    .eq("user_id", params.userId);

  if (competitorErr) {
    console.error("[persist-platform-tracking] saved_competitors update", competitorErr.message);
  }

  const rows: PlatformTrackingRow[] = platforms.map((p) => ({
    platform: p.platform,
    classification: p.classification,
    activeAdCount: p.activeAdCount,
    highCoverageDemoted: p.highCoverageDemoted,
    classifiedAt: nowIso,
    lastClassificationReviewAt: nowIso,
    lastScrapeAt: nowIso,
    nextScrapeAt: computeNextScrapeAt(p.platform, p.classification, nowMs),
  }));

  for (const row of rows) {
    const { error } = await supabase.from("competitor_platform_tracking").upsert(
      {
        user_id: params.userId,
        competitor_id: params.competitorId,
        platform: row.platform,
        classification: row.classification,
        active_ad_count: row.activeAdCount,
        high_coverage_demoted: row.highCoverageDemoted,
        classified_at: row.classifiedAt,
        last_classification_review_at: row.lastClassificationReviewAt,
        last_scrape_at: row.lastScrapeAt,
        next_scrape_at: row.nextScrapeAt,
        updated_at: nowIso,
      },
      { onConflict: "competitor_id,platform" }
    );
    if (error) {
      console.error("[persist-platform-tracking] upsert", row.platform, error.message);
    }
  }

  return rows;
}

export async function loadActiveCountsFromScrapedAds(
  supabase: SupabaseClient<Database>,
  competitorId: string
): Promise<ActiveAdCounts> {
  const [{ data, error }, { data: compRow }] = await Promise.all([
    supabase
      .from("scraped_ads")
      .select("platform, raw_payload, last_seen_at, is_active")
      .eq("competitor_id", competitorId),
    supabase
      .from("saved_competitors")
      .select("last_scraped_at")
      .eq("id", competitorId)
      .maybeSingle(),
  ]);

  if (error || !data) {
    console.error("[loadActiveCountsFromScrapedAds]", error?.message);
    return {};
  }

  const { countActiveAdsFromRawPayloads } = await import("./count-active-ads");
  return countActiveAdsFromRawPayloads(
    data.map((r) => ({
      platform: r.platform,
      raw_payload: r.raw_payload,
      last_seen_at: r.last_seen_at,
      is_active: r.is_active,
    })),
    { lastScrapedAt: compRow?.last_scraped_at ?? null }
  );
}

export async function refreshPlatformTrackingAfterScrape(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    platformsScraped: InitialScrapePlatform[];
    nowIso?: string;
  }
): Promise<void> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const activeCounts = await loadActiveCountsFromScrapedAds(supabase, params.competitorId);

  const { data: existing } = await supabase
    .from("competitor_platform_tracking")
    .select("*")
    .eq("competitor_id", params.competitorId);

  const existingByPlatform = new Map(
    (existing ?? []).map((r) => [r.platform, r])
  );

  const reviewDue = (existing ?? []).some((r) =>
    isClassificationReviewDue(r.last_classification_review_at, nowMs)
  );

  if (!existing?.length || reviewDue) {
    await persistPlatformTracking(supabase, {
      userId: params.userId,
      competitorId: params.competitorId,
      activeCounts,
      highCoverageApplied: false,
      nowIso,
    });
    return;
  }

  const tracking: PlatformTrackingResult[] = [];
  for (const p of params.platformsScraped) {
    const prev = existingByPlatform.get(p);
    const count = activeCounts[p] ?? prev?.active_ad_count ?? 0;
    const classification = prev
      ? reclassifyPlatform(prev.classification as PlatformClassification, count)
      : reclassifyPlatform("INACTIVE", count);
    tracking.push({
      platform: p,
      activeAdCount: count,
      classification,
      highCoverageDemoted: false,
    });
  }

  for (const p of tracking) {
    const prev = existingByPlatform.get(p.platform);
    const { error } = await supabase.from("competitor_platform_tracking").upsert(
      {
        user_id: params.userId,
        competitor_id: params.competitorId,
        platform: p.platform,
        active_ad_count: p.activeAdCount,
        classification: p.classification,
        high_coverage_demoted: false,
        last_scrape_at: nowIso,
        next_scrape_at: computeNextScrapeAt(p.platform, p.classification, nowMs),
        classified_at: prev?.classified_at ?? nowIso,
        last_classification_review_at: prev?.last_classification_review_at ?? nowIso,
        updated_at: nowIso,
      },
      { onConflict: "competitor_id,platform" },
    );
    if (error) {
      console.error("[refreshPlatformTrackingAfterScrape]", p.platform, error.message);
    }
  }
}
