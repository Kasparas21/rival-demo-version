import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import type { Database, Json } from "@/lib/supabase/types";
import { enrichAllPendingScrapedAdsForCompetitor } from "@/lib/strategy-overview/adEnrichment";
import type {
  CompetitorStrategyOverviewPayload,
  DerivationQuality,
} from "@/lib/strategy-overview/payload-types";
import type { ScrapedAdInput } from "@/lib/strategy-overview/strategyDerivation";
import { deriveStrategyOverviewPayload } from "@/lib/strategy-overview/strategyDerivation";
import {
  countAdsCacheRowsForUser,
  expandAdsCacheDomainCandidates,
  tryHydrateScrapedAdsFromAdsCache,
} from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import { inferAudience, buildAudienceInferenceInputFromPayload } from "@/lib/comparison/audience-inference";
import { generateAlertsForCompetitor } from "@/lib/alerts/generate-alerts-for-competitor";
import { recordStrategyOverviewSnapshot } from "@/lib/strategy-overview/strategy-overview-snapshots";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import { getLatestScrapeBatchId } from "@/lib/scrape-batches/get-latest-batch-id";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  computeActiveAdsFingerprint,
  EMPTY_ACTIVE_ADS_FINGERPRINT,
} from "@/lib/strategy-overview/active-ads-fingerprint";
import { SCRAPED_ADS_DERIVATION_SELECT, scrapedAdDerivationRowToInput, type ScrapedAdDerivationRow } from "@/lib/strategy-overview/scraped-ads-derivation-columns";

/** Post-scrape recompute enriches all pending ads in batches (no separate polling cron). */

/**
 * Bump this string any time the spend formula, derivation logic, output schema,
 * or insight card structure changes. It is the cache invalidation key.
 */
export const STRATEGY_OVERVIEW_MODEL_VERSION = "sov-15-funnel-cells-map";

/** Lock lease renewed on progress; enrichment for ~225 ads can run 15–20 min locally. */
const LOCK_TTL_MS = 1_800_000;
/** If status is still "running" after this long without lease renewal, treat as orphaned. */
const ORPHAN_LOCK_AGE_MS = 2_400_000;

async function tryComputeCreativeTestsForCompetitor(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
}): Promise<void> {
  const { supabase, userId, competitorId } = params;
  try {
    const { computeCreativeTestsForCompetitor } = await import("@/lib/creative-tests/compute-creative-tests");
    const ctResult = await computeCreativeTestsForCompetitor({ supabase, userId, competitorId });
    if (!ctResult.ok) {
      console.error("[recompute] Creative tests computation failed:", ctResult.error);
      return;
    }
    console.log(`[recompute] Computed ${ctResult.tests.length} creative tests for ${competitorId}`);
  } catch (err) {
    console.error("[recompute] Creative tests threw:", err);
  }
}

function randomToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function acquireRecomputeLock(
  supabase: SupabaseClient<Database>,
  competitorId: string,
  token: string,
  opts?: { stealLock?: boolean; staleLockMs?: number }
): Promise<boolean> {
  if (opts?.stealLock) {
    await supabase.from("strategy_recompute_locks").delete().eq("competitor_id", competitorId);
  }

  const until = new Date(Date.now() + LOCK_TTL_MS).toISOString();
  const { data: existing } = await supabase
    .from("strategy_recompute_locks")
    .select("locked_until, locked_at")
    .eq("competitor_id", competitorId)
    .maybeSingle();

  if (existing?.locked_until) {
    const lu = Date.parse(existing.locked_until);
    const lat = existing.locked_at ? Date.parse(existing.locked_at) : NaN;
    /** Worker may die without releasing; allow long recomputes before treating as stale. */
    const lockAgeStale = Number.isFinite(lat) && Date.now() - lat > ORPHAN_LOCK_AGE_MS;
    if (Number.isFinite(lu) && lu > Date.now()) {
      if (lockAgeStale) {
        await supabase.from("strategy_recompute_locks").delete().eq("competitor_id", competitorId);
      } else {
        const staleUserRefresh =
          opts?.staleLockMs != null &&
          Number.isFinite(lat) &&
          Date.now() - lat > opts.staleLockMs;
        if (!staleUserRefresh) {
          return false;
        }
        await supabase.from("strategy_recompute_locks").delete().eq("competitor_id", competitorId);
      }
    }
  }

  const { error } = await supabase.from("strategy_recompute_locks").upsert(
    {
      competitor_id: competitorId,
      locked_until: until,
      owner_token: token,
      locked_at: new Date().toISOString(),
      status: "running",
      completed_at: null,
      last_error: null,
      enriched_ads: null,
      total_ads: null,
    },
    { onConflict: "competitor_id" }
  );

  if (error) {
    console.error("[recompute] lock upsert", error.message);
    if (/strategy_recompute_locks|schema cache/i.test(error.message)) {
      console.error(
        "[recompute] Apply SQL patch: supabase/patch_strategy_recompute_locks.sql in the Supabase SQL Editor (same project as your env URL), wait ~1–2 min for PostgREST schema cache, then retry."
      );
    }
    return false;
  }
  return true;
}

async function releaseRecomputeLock(
  supabase: SupabaseClient<Database>,
  competitorId: string,
  token: string,
  opts?: { failed?: boolean; errorMessage?: string; enrichedAds?: number; totalAds?: number }
): Promise<void> {
  const { error, data } = await supabase
    .from("strategy_recompute_locks")
    .update({
      owner_token: null,
      locked_until: new Date(0).toISOString(),
      status: opts?.failed ? "failed" : "idle",
      completed_at: new Date().toISOString(),
      last_error: opts?.failed ? (opts.errorMessage ?? "unknown") : null,
      enriched_ads: opts?.enrichedAds ?? null,
      total_ads: opts?.totalAds ?? null,
    })
    .eq("competitor_id", competitorId)
    .eq("owner_token", token)
    .select("competitor_id");

  if (error) {
    console.warn("[recompute] lock release", error.message);
    return;
  }
  if (!data?.length) {
    console.warn(
      `[recompute] lock release matched 0 rows competitorId=${competitorId} (owner_token mismatch or row replaced)`
    );
  }
}

async function updateLockProgress(
  supabase: SupabaseClient<Database>,
  competitorId: string,
  token: string,
  patch: { total_ads?: number; enriched_ads?: number }
): Promise<void> {
  await supabase
    .from("strategy_recompute_locks")
    .update({
      ...patch,
      locked_until: new Date(Date.now() + LOCK_TTL_MS).toISOString(),
    })
    .eq("competitor_id", competitorId)
    .eq("owner_token", token);
}

/** Returns false when another worker stole/replaced the lock — stop enrichment to avoid duplicate LLM spend. */
export async function isRecomputeLockOwner(
  supabase: SupabaseClient<Database>,
  competitorId: string,
  token: string
): Promise<boolean> {
  const { data } = await supabase
    .from("strategy_recompute_locks")
    .select("owner_token, status")
    .eq("competitor_id", competitorId)
    .maybeSingle();
  return data?.status === "running" && data.owner_token === token;
}

function rowToInput(r: Database["public"]["Tables"]["scraped_ads"]["Row"]): ScrapedAdInput {
  return {
    id: r.id,
    platform: r.platform,
    ad_text: r.ad_text,
    format: r.format,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    ai_extracted_angle: r.ai_extracted_angle,
    funnel_stage: r.funnel_stage,
    ai_enrichment_status: r.ai_enrichment_status ?? null,
    ai_extracted_launch_date: r.ai_extracted_launch_date ?? null,
    ai_extracted_voice_tone: r.ai_extracted_voice_tone ?? null,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  };
}

async function countActiveScrapedAds(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("scraped_ads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true);
  if (error) {
    console.warn("[recompute] scraped_ads count", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Exported for `/api/strategy-overview/compiled` fast path when there are zero scraped rows. */
export function buildNoAdsFoundPayload(
  meta: { name: string; domain: string; logoUrl: string | null }
): CompetitorStrategyOverviewPayload {
  const nowIso = new Date().toISOString();
  const competitor = { name: meta.name, domain: meta.domain, logoUrl: meta.logoUrl };
  return {
    version: 1,
    pipelineStatus: "no_ads_found",
    derivationQuality: "low",
    enrichedAdCount: 0,
    totalAdCount: 0,
    enrichmentRate: 0,
    sourceScrapeBatchId: null,
    map: {
      title: `${meta.name} Full Funnel Strategy Map`,
      competitor,
      totalAdSpend: {
        value: 0,
        low: 0,
        high: 0,
        currency: "EUR",
        unit: "month",
        confidence: "low",
        brandScaleScore: 0.5,
      },
      spendVsSimilar: "Very Low",
      spendTrendline: [],
      audienceSignals: {
        interests: [],
        ageRange: "—",
        geo: "—",
        targetingType: [],
      },
      dominantFormat: { format: "—", percentage: 0 },
      toneOfVoice: { primary: "—", attributes: [] },
      topAngles: [],
      platformNodes: [],
      funnelEdges: [],
      activeAdCount: 0,
      platformCount: 0,
      derivationQuality: "low",
    },
    insights: {
      platform_footprint: {
        title: "Platform Footprint",
        subtitle: "Active ad presence per platform",
        tooltip:
          "Side-by-side platform comparison: active ads per platform and modeled monthly spend range (benchmark-based — not invoiced spend).",
        aiNarrative: null,
        lastUpdated: nowIso,
        dataConfidence: "low",
        platforms: [],
        totalActiveAds: 0,
        totalEstSpendEur: 0,
        totalEstSpendEurLow: 0,
        totalEstSpendEurHigh: 0,
        platformCount: 0,
      },
      budget_allocation: {
        title: "Budget Allocation",
        subtitle: "Estimated monthly spend share by platform",
        tooltip:
          "Estimated using benchmark CPM × active ad count × brand size multiplier × format coefficient. NOT invoiced spend.",
        aiNarrative: null,
        lastUpdated: nowIso,
        dataConfidence: "low",
        segments: [],
        totalEstSpendEur: 0,
        insight: "—",
      },
      library_activity_timeline: {
        title: "Library Activity Timeline",
        subtitle: "Monthly count of ads by launch date",
        tooltip:
          "Monthly ad launches. Uses platform-reported launch date when available, otherwise shows when the ad first appeared in your scraped library.",
        aiNarrative: null,
        lastUpdated: nowIso,
        dataConfidence: "low",
        months: [],
        dataQuality: { realLaunchPct: 0, qualityLabel: "low", warning: "No ads to analyze." },
      },
      funnel_distribution: {
        title: "Funnel Distribution",
        subtitle: "Share of ads by inferred funnel stage",
        tooltip:
          "Real share of active ads by funnel stage (TOF / MOF / BOF) using enriched `funnel_stage` when present; unclassified ads are excluded from stage totals.",
        aiNarrative: null,
        lastUpdated: nowIso,
        dataConfidence: "low",
        stages: [],
        totalClassified: 0,
        totalAds: 0,
        insufficientData: true,
      },
      angle_clustering: {
        title: "Angle Clustering",
        subtitle: "Top creative angles by ad count",
        tooltip:
          "Creative angles from enrichment (`ai_extracted_angle`). Each classified ad receives one label. “Unclassified” means missing or broad extraction.",
        aiNarrative: null,
        lastUpdated: nowIso,
        dataConfidence: "low",
        angles: [],
        unclassifiedPct: 0,
        insufficientData: true,
      },
      voice_tone_position: {
        title: "Voice & Tone Position",
        subtitle: "Average tone across enriched ads",
        tooltip:
          "Average formality and emotional weighting from enrichment (`ai_extracted_voice_tone`): formal 0–1 (casual→formal), emotional 0–1 (rational→emotional), plus mean model confidence.",
        aiNarrative: null,
        lastUpdated: nowIso,
        dataConfidence: "low",
        competitor: null,
        userBrand: null,
        sampleSize: 0,
      },
      ad_format_mix: {
        title: "Ad Format Mix",
        subtitle: "Distribution of creative formats",
        tooltip: "Share of active ads by `format` from the scrape row (image, video, carousel, etc.).",
        aiNarrative: null,
        lastUpdated: nowIso,
        dataConfidence: "low",
        formats: [],
      },
      voice_tone_by_platform: [],
      angles_by_platform: [],
      testing_velocity_by_platform: [],
      spend_trend_by_platform: [],
    },
    audience_inference: null,
  };
}

export { getLatestScrapeBatchId } from "@/lib/scrape-batches/get-latest-batch-id";

export async function loadSavedCompetitorForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string
): Promise<{
  competitorId: string;
  cacheDomain: string;
  name: string;
  brandDomain: string | null;
  logoUrl: string | null;
  lastScrapedAt: string | null;
  lastMoveDetectionAt: string | null;
} | null> {
  const { competitorId, cacheDomain } = await resolveAdsCacheDomainForUser(supabase, userId, domainHint);
  if (!competitorId) return null;

  const { data: row } = await supabase
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, brand_logo_url, logo_url, last_scraped_at, last_move_detection_at")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) return null;

  return {
    competitorId: row.id,
    cacheDomain,
    name: row.brand_name?.trim() || row.name,
    brandDomain: row.brand_domain,
    logoUrl: row.brand_logo_url ?? row.logo_url,
    lastScrapedAt: row.last_scraped_at,
    lastMoveDetectionAt: row.last_move_detection_at ?? null,
  };
}

function strategyPayloadLooksEmpty(p: CompetitorStrategyOverviewPayload): boolean {
  if (p.pipelineStatus === "no_ads_found") return true;
  const active = p.map?.activeAdCount ?? 0;
  const total = p.totalAdCount ?? 0;
  return active === 0 && total === 0;
}

export async function getCachedStrategyOverview(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  /** When set, empty cached overviews are invalidated if ads still live only in `ads_cache`. */
  domainHint?: string
): Promise<CompetitorStrategyOverviewPayload | null> {
  const [{ data }, liveFingerprint] = await Promise.all([
    supabase
      .from("competitor_strategy_overview")
      .select("payload, ai_model_version, ads_fingerprint")
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .maybeSingle(),
    computeActiveAdsFingerprint(supabase, userId, competitorId),
  ]);

  if (!data?.payload || typeof data.payload !== "object") return null;

  if (data.ai_model_version !== STRATEGY_OVERVIEW_MODEL_VERSION) return null;

  const storedFingerprint = data.ads_fingerprint?.trim() || null;
  if (!storedFingerprint || storedFingerprint !== liveFingerprint) return null;

  const payload = data.payload as CompetitorStrategyOverviewPayload;
  if (strategyPayloadLooksEmpty(payload)) {
    const scrapedNow = await countActiveScrapedAds(supabase, userId, competitorId);
    if (scrapedNow > 0) return null;

    const hint = domainHint?.trim();
    if (hint) {
      const { readDomains } = await resolveAdsCacheDomainForUser(supabase, userId, hint);
      const domains = expandAdsCacheDomainCandidates(readDomains);
      const cacheRows = await countAdsCacheRowsForUser(supabase, userId, domains);
      if (cacheRows > 0) return null;
    }
  }

  return normalizeCompetitorStrategyOverviewPayload(payload);
}

/** Any stored payload for this competitor (ignore batch / model version) — for stale-while-recomputing. */
export async function getStaleStrategyOverviewPayload(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string
): Promise<CompetitorStrategyOverviewPayload | null> {
  const { data } = await supabase
    .from("competitor_strategy_overview")
    .select("payload")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.payload || typeof data.payload !== "object") return null;
  return normalizeCompetitorStrategyOverviewPayload(data.payload as CompetitorStrategyOverviewPayload);
}

export async function getRecomputeLockRow(
  supabase: SupabaseClient<Database>,
  competitorId: string
): Promise<{
  status: string | null;
  locked_until: string | null;
  locked_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  enriched_ads: number | null;
  total_ads: number | null;
} | null> {
  const { data } = await supabase
    .from("strategy_recompute_locks")
    .select("status, locked_until, locked_at, completed_at, last_error, enriched_ads, total_ads")
    .eq("competitor_id", competitorId)
    .maybeSingle();
  return data ?? null;
}

/**
 * If the row is still `running` but lock TTL expired or lock is older than ORPHAN_LOCK_AGE_MS,
 * persist idle state so `acquireRecomputeLock` can succeed (ghost lock after hard runtime kill).
 */
export async function healStaleStrategyRecomputeLockIfNeeded(
  supabase: SupabaseClient<Database>,
  competitorId: string
): Promise<boolean> {
  const row = await getRecomputeLockRow(supabase, competitorId);
  if (!row || row.status !== "running") return false;

  const until = row.locked_until ? Date.parse(row.locked_until) : NaN;
  const started = row.locked_at ? Date.parse(row.locked_at) : NaN;
  const lockExpired = Number.isFinite(until) && until <= Date.now();
  const lockTooOld = Number.isFinite(started) && Date.now() - started > ORPHAN_LOCK_AGE_MS;

  /** Only heal when lease expired AND lock is old — active workers extend locked_until each batch. */
  if (!lockTooOld && !lockExpired) return false;
  if (lockExpired && !lockTooOld) return false;

  const { error, data } = await supabase
    .from("strategy_recompute_locks")
    .update({
      owner_token: null,
      locked_until: new Date(0).toISOString(),
      status: "idle",
      completed_at: new Date().toISOString(),
      last_error: null,
      enriched_ads: row.enriched_ads ?? null,
      total_ads: row.total_ads ?? null,
    })
    .eq("competitor_id", competitorId)
    .eq("status", "running")
    .select("competitor_id");

  if (error) {
    console.warn("[recompute] heal stale lock failed", error.message);
    return false;
  }
  if (!data?.length) {
    return false;
  }
  console.log(`[recompute] healed stale/orphan lock competitorId=${competitorId}`);
  return true;
}

export async function recomputeStrategyOverviewForCompetitor(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  domainHint: string;
  stealLock?: boolean;
  refreshAdEnrichment?: boolean;
  /** When set, take over locks held longer than this many ms (user refresh). */
  staleLockMs?: number;
}): Promise<{ ok: true; payload: CompetitorStrategyOverviewPayload } | { ok: false; error: string }> {
  const { supabase, userId, competitorId, domainHint, stealLock, refreshAdEnrichment, staleLockMs } =
    params;
  const token = randomToken();
  const t0 = Date.now();

  const staleMs = stealLock ? undefined : staleLockMs;

  await healStaleStrategyRecomputeLockIfNeeded(supabase, competitorId);

  const locked = await acquireRecomputeLock(supabase, competitorId, token, {
    stealLock,
    staleLockMs: staleMs,
  });
  if (!locked) {
    return { ok: false, error: "Recompute already in progress for this competitor" };
  }

  let lockReleased = false;
  const markLockReleased = async (opts?: {
    failed?: boolean;
    errorMessage?: string;
    enrichedAds?: number;
    totalAds?: number;
  }) => {
    await releaseRecomputeLock(supabase, competitorId, token, opts);
    lockReleased = true;
  };

  let aiCostUsdTotal = 0;

  try {
    console.log(`[recompute] start competitorId=${competitorId} userId=${userId}`);

    const meta = await loadSavedCompetitorForUser(supabase, userId, domainHint);
    if (!meta) {
      await markLockReleased({ failed: true, errorMessage: "no meta" });
      return { ok: false, error: "Competitor not found" };
    }

    const { readDomains } = await resolveAdsCacheDomainForUser(supabase, userId, domainHint);
    const cacheDomainCandidates = expandAdsCacheDomainCandidates(readDomains);

    let scrapedCount = await countActiveScrapedAds(supabase, userId, competitorId);
    const cacheCount = await countAdsCacheRowsForUser(supabase, userId, cacheDomainCandidates);
    console.log(`[recompute] scraped_ads count=${scrapedCount} | ads_cache count=${cacheCount}`);

    const hydrateResult = await tryHydrateScrapedAdsFromAdsCache(supabase, { userId, competitorId, domainHint });

    scrapedCount = await countActiveScrapedAds(supabase, userId, competitorId);
    console.log(
      `[recompute] hydration ran → scraped_ads after hydration=${scrapedCount} hydrate_ok=${hydrateResult.ok} reason=${hydrateResult.reason} rowsInserted=${hydrateResult.rowsInserted}`
    );

    if (scrapedCount === 0 && cacheCount === 0 && hydrateResult.rowsInserted === 0) {
      const emptyPayload = buildNoAdsFoundPayload({
        name: meta.name,
        domain: meta.brandDomain ?? meta.cacheDomain,
        logoUrl: meta.logoUrl,
      });
      const derivQ: DerivationQuality = "low";
      const durationMs = Date.now() - t0;
      console.log(`[recompute] complete → durationMs=${durationMs} | quality=${derivQ} | no_ads_found`);

      await markLockReleased({ enrichedAds: 0, totalAds: 0 });

      const { error: upOverviewErr } = await supabase.from("competitor_strategy_overview").upsert(
        {
          user_id: userId,
          competitor_id: competitorId,
          payload: emptyPayload as unknown as Json,
          source_scrape_batch_id: null,
          ai_model_version: STRATEGY_OVERVIEW_MODEL_VERSION,
          ads_fingerprint: EMPTY_ACTIVE_ADS_FINGERPRINT,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "competitor_id" }
      );
      if (upOverviewErr) {
        return { ok: false, error: upOverviewErr.message };
      }

      await recordStrategyOverviewSnapshot({
        supabase,
        userId,
        competitorId,
        payload: emptyPayload,
        sourceScrapeBatchId: null,
        aiModelVersion: STRATEGY_OVERVIEW_MODEL_VERSION,
      });

      await tryComputeCreativeTestsForCompetitor({ supabase, userId, competitorId });

      return { ok: true, payload: emptyPayload };
    }

    if (scrapedCount === 0) {
      const emptyPayload = buildNoAdsFoundPayload({
        name: meta.name,
        domain: meta.brandDomain ?? meta.cacheDomain,
        logoUrl: meta.logoUrl,
      });
      await markLockReleased({ enrichedAds: 0, totalAds: 0 });
      const emptyBatchId = await getLatestScrapeBatchId(supabase, competitorId);
      const { error: upOverviewErr } = await supabase.from("competitor_strategy_overview").upsert(
        {
          user_id: userId,
          competitor_id: competitorId,
          payload: emptyPayload as unknown as Json,
          source_scrape_batch_id: emptyBatchId,
          ai_model_version: STRATEGY_OVERVIEW_MODEL_VERSION,
          ads_fingerprint: EMPTY_ACTIVE_ADS_FINGERPRINT,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "competitor_id" }
      );
      if (upOverviewErr) {
        return { ok: false, error: upOverviewErr.message };
      }
      await recordStrategyOverviewSnapshot({
        supabase,
        userId,
        competitorId,
        payload: emptyPayload,
        sourceScrapeBatchId: emptyBatchId,
        aiModelVersion: STRATEGY_OVERVIEW_MODEL_VERSION,
      });

      await tryComputeCreativeTestsForCompetitor({ supabase, userId, competitorId });

      return { ok: true, payload: emptyPayload };
    }

    const { data: adsRows, error: adsErr } = await supabase
      .from("scraped_ads")
      .select(SCRAPED_ADS_DERIVATION_SELECT)
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (adsErr) {
      await markLockReleased({ failed: true, errorMessage: adsErr.message });
      return { ok: false, error: adsErr.message };
    }

    const rowList = (adsRows ?? []) as ScrapedAdDerivationRow[];
    await updateLockProgress(supabase, competitorId, token, { total_ads: rowList.length });

    if (refreshAdEnrichment && rowList.length > 0) {
      const ids = rowList.map((r) => r.id);
      await supabase.from("ad_enrichment_log").delete().in("scraped_ad_id", ids);
      await supabase
        .from("scraped_ads")
        .update({
          ai_extracted_angle: null,
          funnel_stage: null,
          ai_extracted_voice_tone: null,
          ai_enrichment_status: "pending",
        })
        .in("id", ids)
        .eq("user_id", userId);
    }

    const enrichStats = await enrichAllPendingScrapedAdsForCompetitor(supabase, userId, competitorId, {
      beforeBatch: () => isRecomputeLockOwner(supabase, competitorId, token),
      afterBatch: () => updateLockProgress(supabase, competitorId, token, {}),
    });
    aiCostUsdTotal += enrichStats.usageCostUsd;
    console.log(
      `[recompute] post-enrichment competitorId=${competitorId} enriched=${enrichStats.enriched} needsEnrichment=${enrichStats.needsEnrichment} skippedNoText=${enrichStats.skippedNoText} failedBatch=${enrichStats.failedBatch} costUsd=${enrichStats.usageCostUsd.toFixed(4)}`
    );

    const { count: enrichedStatusCount } = await supabase
      .from("scraped_ads")
      .select("id", { count: "exact", head: true })
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("ai_enrichment_status", "enriched");

    await updateLockProgress(supabase, competitorId, token, { enriched_ads: enrichedStatusCount ?? 0 });

    const { data: refreshed } = await supabase
      .from("scraped_ads")
      .select(SCRAPED_ADS_DERIVATION_SELECT)
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1000);

    const freshInputs = ((refreshed ?? []) as ScrapedAdDerivationRow[]).map(scrapedAdDerivationRowToInput);
    const batchId = await getLatestScrapeBatchId(supabase, competitorId);
    const totalActive = freshInputs.length;
    const enrichedDb = enrichedStatusCount ?? 0;
    const enrichmentRate = totalActive > 0 ? enrichedDb / totalActive : 0;
    console.log(
      `[enrichment] final enrichmentRate=${enrichmentRate.toFixed(2)} for competitorId=${competitorId}`
    );

    const lowEnrichmentConfidence = totalActive > 0 && enrichmentRate < 0.5;

    const footprintRows = (refreshed ?? []).map((r) => ({
      id: r.id,
      platform: r.platform,
      first_seen_at: r.first_seen_at,
      last_seen_at: r.last_seen_at,
      is_active: r.is_active,
      raw_payload: r.raw_payload,
    }));

    let payload = deriveStrategyOverviewPayload(
      freshInputs,
      {
        name: meta.name,
        domain: meta.brandDomain ?? meta.cacheDomain,
        logoUrl: meta.logoUrl,
      },
      batchId,
      {
        spendV2: {
          footprintRows,
          competitorId,
          userId,
          brandDomain: meta.brandDomain,
          lastScrapedAt: meta.lastScrapedAt,
        },
      }
    );

    payload = { ...payload, lowEnrichmentConfidence };

    await tryComputeCreativeTestsForCompetitor({ supabase, userId, competitorId });

    if (payload.pipelineStatus !== "no_ads_found" && (payload.totalAdCount ?? 0) > 0) {
      const domain = meta.brandDomain ?? meta.cacheDomain;
      const audIn = buildAudienceInferenceInputFromPayload(
        { brandName: meta.name, brandDomain: domain },
        payload
      );
      const aud = await inferAudience(audIn);
      payload = { ...payload, audience_inference: aud };
    } else {
      payload = { ...payload, audience_inference: null };
    }

    const derivQ = (payload.derivationQuality ?? payload.map.derivationQuality ?? "medium") as DerivationQuality;
    const aiCostCents = Math.round(aiCostUsdTotal * 100);
    const durationMs = Date.now() - t0;
    console.log(
      `[recompute] complete → durationMs=${durationMs} | aiCostCents=${aiCostCents} | quality=${derivQ}`
    );

    const payloadJson = payload as unknown as Json;
    const adsFingerprint = await computeActiveAdsFingerprint(supabase, userId, competitorId);

    const { error: upOverviewErr } = await supabase.from("competitor_strategy_overview").upsert(
      {
        user_id: userId,
        competitor_id: competitorId,
        payload: payloadJson,
        source_scrape_batch_id: batchId,
        ai_model_version: STRATEGY_OVERVIEW_MODEL_VERSION,
        ads_fingerprint: adsFingerprint,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "competitor_id" }
    );

    if (upOverviewErr) {
      await markLockReleased({ failed: true, errorMessage: upOverviewErr.message });
      return { ok: false, error: upOverviewErr.message };
    }

    await recordStrategyOverviewSnapshot({
      supabase,
      userId,
      competitorId,
      payload,
      sourceScrapeBatchId: batchId,
      aiModelVersion: STRATEGY_OVERVIEW_MODEL_VERSION,
    });

    void (async () => {
      try {
        const admin = createSupabaseAdminClient();
        const [{ data: snapshots }, { data: priorScore }] = await Promise.all([
          admin
            .from("competitor_strategy_overview_snapshots")
            .select("payload")
            .eq("competitor_id", competitorId)
            .eq("user_id", userId)
            .order("computed_at", { ascending: false })
            .limit(2),
          admin
            .from("competitor_activity_scores")
            .select("score")
            .eq("user_id", userId)
            .eq("competitor_id", competitorId)
            .maybeSingle(),
        ]);

        const beforeRaw = snapshots?.[1]?.payload;
        const beforePayload =
          beforeRaw && typeof beforeRaw === "object"
            ? normalizeCompetitorStrategyOverviewPayload(beforeRaw as CompetitorStrategyOverviewPayload)
            : null;

        await generateAlertsForCompetitor({
          supabase: admin,
          userId,
          competitorId,
          beforePayload,
          afterPayload: payload,
          batchId,
          activityScoreBefore: priorScore?.score ?? null,
          activityScoreAfter: priorScore?.score ?? null,
        });
      } catch (e) {
        console.error("[recompute] generateAlertsForCompetitor", e);
      }
    })();

    await supabase.from("funnel_flow_edges").delete().eq("competitor_id", competitorId).eq("user_id", userId);

    const edgeRows = payload.map.funnelEdges.map((e) => ({
      user_id: userId,
      competitor_id: competitorId,
      from_platform: e.from,
      to_platform: e.to,
      confidence_score: e.confidence,
      reasoning: e.reasoning,
      edge_style: e.style,
    }));

    if (edgeRows.length > 0) {
      const { error: edgeErr } = await supabase.from("funnel_flow_edges").insert(edgeRows);
      if (edgeErr) console.error("[recompute] funnel_flow_edges", edgeErr.message);
    }

    await markLockReleased({ enrichedAds: enrichedDb, totalAds: totalActive });

    return { ok: true, payload };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "recompute failed";
    console.error(`[recompute] catch competitorId=${competitorId}`, e);
    if (!lockReleased) {
      await releaseRecomputeLock(supabase, competitorId, token, { failed: true, errorMessage: msg }).catch(
        () => undefined
      );
      lockReleased = true;
    }
    return { ok: false, error: msg };
  } finally {
    if (!lockReleased) {
      await releaseRecomputeLock(supabase, competitorId, token, {
        failed: true,
        errorMessage: "aborted_before_explicit_release",
      }).catch(() => undefined);
    }
  }
}
