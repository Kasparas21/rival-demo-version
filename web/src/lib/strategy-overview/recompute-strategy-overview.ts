import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import type { Database, Json } from "@/lib/supabase/types";
import { enrichScrapedAdsIfNeeded } from "@/lib/strategy-overview/adEnrichment";
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
import { enrichStrategyOverviewWithInsightLLM } from "@/lib/strategy-overview/insightNarratives";

export const STRATEGY_OVERVIEW_MODEL_VERSION = "sov-8-brand-scale-spend";

const LOCK_TTL_MS = 300_000;
/** If status is still "running" after this long, treat lock as orphaned (crashed serverless, etc.). */
const ORPHAN_LOCK_AGE_MS = 900_000;

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
  const { error } = await supabase
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
    .eq("owner_token", token);

  if (error) {
    console.warn("[recompute] lock release", error.message);
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
    .update(patch)
    .eq("competitor_id", competitorId)
    .eq("owner_token", token);
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

function buildNoAdsFoundPayload(
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
      funnel_architecture: {
        aiNarrative: "No ads available yet.",
        lastUpdated: nowIso,
        dataConfidence: "low",
        aiNarrativeSource: "heuristic",
        layers: [],
      },
      budget_allocation: {
        aiNarrative: "No ads available yet.",
        lastUpdated: nowIso,
        dataConfidence: "low",
        aiNarrativeSource: "heuristic",
        segments: [],
        insight: "—",
      },
      creative_cadence: {
        aiNarrative: "No ads available yet.",
        lastUpdated: nowIso,
        dataConfidence: "low",
        aiNarrativeSource: "heuristic",
        months: [],
        launches: [],
      },
      audience_signal_map: {
        aiNarrative: "No ads available yet.",
        lastUpdated: nowIso,
        dataConfidence: "low",
        aiNarrativeSource: "heuristic",
        signals: [],
      },
      angle_clustering: {
        aiNarrative: "No ads available yet.",
        lastUpdated: nowIso,
        dataConfidence: "low",
        aiNarrativeSource: "heuristic",
        rows: [],
      },
      voice_tone_fingerprint: {
        aiNarrative: "No ads available yet.",
        lastUpdated: nowIso,
        dataConfidence: "low",
        aiNarrativeSource: "heuristic",
        competitor: { formal: 0.5, emotional: 0.5 },
        userBrand: null,
      },
      performance_pulse: {
        aiNarrative: "No ads available yet.",
        lastUpdated: nowIso,
        dataConfidence: "low",
        aiNarrativeSource: "heuristic",
        weeks: [],
        volume: [],
        trend: "flat",
      },
    },
  };
}

export async function getLatestScrapeBatchId(
  supabase: SupabaseClient<Database>,
  competitorId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("scrape_batches")
    .select("id")
    .eq("competitor_id", competitorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

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
} | null> {
  const { competitorId, cacheDomain } = await resolveAdsCacheDomainForUser(supabase, userId, domainHint);
  if (!competitorId) return null;

  const { data: row } = await supabase
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, brand_logo_url, logo_url")
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
  const { data } = await supabase
    .from("competitor_strategy_overview")
    .select("payload, ai_model_version, source_scrape_batch_id")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.payload || typeof data.payload !== "object") return null;

  if (data.ai_model_version !== STRATEGY_OVERVIEW_MODEL_VERSION) return null;

  const latestBatch = await getLatestScrapeBatchId(supabase, competitorId);
  if (latestBatch !== data.source_scrape_batch_id) return null;

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

  return payload;
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
  return data.payload as CompetitorStrategyOverviewPayload;
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

  const locked = await acquireRecomputeLock(supabase, competitorId, token, {
    stealLock,
    staleLockMs: staleMs,
  });
  if (!locked) {
    return { ok: false, error: "Recompute already in progress for this competitor" };
  }

  let aiCostUsdTotal = 0;

  try {
    console.log(`[recompute] start competitorId=${competitorId} userId=${userId}`);

    const meta = await loadSavedCompetitorForUser(supabase, userId, domainHint);
    if (!meta) {
      await releaseRecomputeLock(supabase, competitorId, token, { failed: true, errorMessage: "no meta" });
      return { ok: false, error: "Competitor not found" };
    }

    const { readDomains } = await resolveAdsCacheDomainForUser(supabase, userId, domainHint);
    const cacheDomainCandidates = expandAdsCacheDomainCandidates(readDomains);

    let scrapedCount = await countActiveScrapedAds(supabase, userId, competitorId);
    const cacheCount = await countAdsCacheRowsForUser(supabase, userId, cacheDomainCandidates);
    console.log(`[recompute] scraped_ads count=${scrapedCount} | ads_cache count=${cacheCount}`);

    const hydrated = await tryHydrateScrapedAdsFromAdsCache(supabase, { userId, competitorId, domainHint });

    scrapedCount = await countActiveScrapedAds(supabase, userId, competitorId);
    console.log(`[recompute] hydration ran → scraped_ads after hydration=${scrapedCount}`);

    if (scrapedCount === 0 && cacheCount === 0 && !hydrated) {
      const emptyPayload = buildNoAdsFoundPayload({
        name: meta.name,
        domain: meta.brandDomain ?? meta.cacheDomain,
        logoUrl: meta.logoUrl,
      });
      const derivQ: DerivationQuality = "low";
      const durationMs = Date.now() - t0;
      console.log(`[recompute] complete → durationMs=${durationMs} | quality=${derivQ} | no_ads_found`);

      await releaseRecomputeLock(supabase, competitorId, token, { enrichedAds: 0, totalAds: 0 });

      const { error: upOverviewErr } = await supabase.from("competitor_strategy_overview").upsert(
        {
          user_id: userId,
          competitor_id: competitorId,
          payload: emptyPayload as unknown as Json,
          source_scrape_batch_id: null,
          ai_model_version: STRATEGY_OVERVIEW_MODEL_VERSION,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "competitor_id" }
      );
      if (upOverviewErr) {
        return { ok: false, error: upOverviewErr.message };
      }

      return { ok: true, payload: emptyPayload };
    }

    if (scrapedCount === 0) {
      const emptyPayload = buildNoAdsFoundPayload({
        name: meta.name,
        domain: meta.brandDomain ?? meta.cacheDomain,
        logoUrl: meta.logoUrl,
      });
      await releaseRecomputeLock(supabase, competitorId, token, { enrichedAds: 0, totalAds: 0 });
      const { error: upOverviewErr } = await supabase.from("competitor_strategy_overview").upsert(
        {
          user_id: userId,
          competitor_id: competitorId,
          payload: emptyPayload as unknown as Json,
          source_scrape_batch_id: await getLatestScrapeBatchId(supabase, competitorId),
          ai_model_version: STRATEGY_OVERVIEW_MODEL_VERSION,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "competitor_id" }
      );
      if (upOverviewErr) {
        return { ok: false, error: upOverviewErr.message };
      }
      return { ok: true, payload: emptyPayload };
    }

    const { data: adsRows, error: adsErr } = await supabase
      .from("scraped_ads")
      .select("*")
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (adsErr) {
      await releaseRecomputeLock(supabase, competitorId, token, { failed: true, errorMessage: adsErr.message });
      return { ok: false, error: adsErr.message };
    }

    const rowList = adsRows ?? [];
    await updateLockProgress(supabase, competitorId, token, { total_ads: rowList.length });

    let enrichInputs: ScrapedAdInput[] = rowList.map(rowToInput);
    if (refreshAdEnrichment && rowList.length > 0) {
      const ids = rowList.map((r) => r.id);
      await supabase.from("ad_enrichment_log").delete().in("scraped_ad_id", ids);
      await supabase
        .from("scraped_ads")
        .update({
          ai_extracted_angle: null,
          funnel_stage: null,
          ai_enrichment_status: "pending",
        })
        .in("id", ids)
        .eq("user_id", userId);
      enrichInputs = rowList.map((r) =>
        rowToInput({
          ...r,
          ai_extracted_angle: null,
          funnel_stage: null,
          ai_enrichment_status: "pending",
        })
      );
    }

    const enrichStats = await enrichScrapedAdsIfNeeded(supabase, userId, competitorId, enrichInputs);
    aiCostUsdTotal += enrichStats.usageCostUsd;

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
      .select("*")
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1000);

    const freshInputs = (refreshed ?? []).map(rowToInput);
    const batchId = await getLatestScrapeBatchId(supabase, competitorId);
    const totalActive = freshInputs.length;
    const enrichedDb = enrichedStatusCount ?? 0;
    const enrichmentRate = totalActive > 0 ? enrichedDb / totalActive : 0;
    console.log(
      `[enrichment] final enrichmentRate=${enrichmentRate.toFixed(2)} for competitorId=${competitorId}`
    );

    const lowEnrichmentConfidence = totalActive > 0 && enrichmentRate < 0.5;

    let payload = deriveStrategyOverviewPayload(
      freshInputs,
      {
        name: meta.name,
        domain: meta.brandDomain ?? meta.cacheDomain,
        logoUrl: meta.logoUrl,
      },
      batchId
    );

    payload = { ...payload, lowEnrichmentConfidence };

    const insightOut = await enrichStrategyOverviewWithInsightLLM(payload, freshInputs);
    payload = insightOut.payload;
    aiCostUsdTotal += insightOut.usageCostUsd;

    const derivQ = (payload.derivationQuality ?? payload.map.derivationQuality ?? "medium") as DerivationQuality;
    const aiCostCents = Math.round(aiCostUsdTotal * 100);
    const durationMs = Date.now() - t0;
    console.log(
      `[recompute] complete → durationMs=${durationMs} | aiCostCents=${aiCostCents} | quality=${derivQ}`
    );

    const payloadJson = payload as unknown as Json;

    const { error: upOverviewErr } = await supabase.from("competitor_strategy_overview").upsert(
      {
        user_id: userId,
        competitor_id: competitorId,
        payload: payloadJson,
        source_scrape_batch_id: batchId,
        ai_model_version: STRATEGY_OVERVIEW_MODEL_VERSION,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "competitor_id" }
    );

    if (upOverviewErr) {
      await releaseRecomputeLock(supabase, competitorId, token, { failed: true, errorMessage: upOverviewErr.message });
      return { ok: false, error: upOverviewErr.message };
    }

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

    await supabase.from("strategy_insights_cards").delete().eq("competitor_id", competitorId).eq("user_id", userId);

    const cardTypes = [
      "funnel_architecture",
      "budget_allocation",
      "creative_cadence",
      "audience_signal_map",
      "angle_clustering",
      "voice_tone_fingerprint",
      "performance_pulse",
    ] as const;

    const insightPayload = payload.insights;
    const inserts = cardTypes.map((ct) => ({
      user_id: userId,
      competitor_id: competitorId,
      card_type: ct,
      payload: insightPayload[ct] as unknown as Json,
      generated_at: new Date().toISOString(),
    }));

    const { error: cardErr } = await supabase.from("strategy_insights_cards").insert(inserts);
    if (cardErr) console.error("[recompute] strategy_insights_cards", cardErr.message);

    await releaseRecomputeLock(supabase, competitorId, token, { enrichedAds: enrichedDb, totalAds: totalActive });

    return { ok: true, payload };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "recompute failed";
    await releaseRecomputeLock(supabase, competitorId, token, { failed: true, errorMessage: msg });
    return { ok: false, error: msg };
  }
}
