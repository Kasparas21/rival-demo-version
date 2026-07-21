import { after } from "next/server";
import { NextResponse } from "next/server";

import { maybeDetectMoves } from "@/lib/comparison/maybe-detect-moves";
import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import { computeScrapedAdsDerivedStats, type ComparisonDerivedStats } from "@/lib/comparison/scraped-ads-derived-stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { deriveAndPersistFastPathStrategyOverview } from "@/lib/strategy-overview/derive-and-persist-fast-path";
import {
  hydrateAudienceInferenceIfReady,
  isStrategyRecomputeRunning,
  mergeAudienceInference,
  scrapeIsNewerThanOverview,
} from "@/lib/strategy-overview/strategy-overview-display";
import {
  getCachedStrategyOverview,
  getStaleStrategyOverviewPayload,
  loadSavedCompetitorForUser,
  recomputeStrategyOverviewForCompetitor,
} from "@/lib/strategy-overview/recompute-strategy-overview";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const USER_STALE_LOCK_MS = 90_000;

type SideMeta = {
  competitorId: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  lastScrapedAt: string | null;
  lastMoveDetectionAt: string | null;
};

type ComparisonSideResponse = {
  meta: SideMeta;
  payload: CompetitorStrategyOverviewPayload | null;
  recomputing: boolean;
  needsScrape?: boolean;
  recent_moves: ComparisonMoveRow[];
  snapshot_count: number;
  audienceHistory: Array<{ snapshotDate: string; primarySegmentName: string; primaryConfidence: number }>;
  derivedStats: ComparisonDerivedStats;
};

export type ComparisonMoveApi = ComparisonMoveRow;

function scheduleMoveDetection(params: { userId: string; workspaceId: string; rivalId: string }): void {
  const { userId, workspaceId, rivalId } = params;
  after(async () => {
    try {
      const sb = await createSupabaseServerClient();
      const {
        data: { user: u2 },
      } = await sb.auth.getUser();
      if (!u2 || u2.id !== userId) return;
      await maybeDetectMoves({ supabase: sb, userId, competitorId: workspaceId });
      await maybeDetectMoves({ supabase: sb, userId, competitorId: rivalId });
    } catch (e) {
      console.error("[comparison/payload] move detection failed", e);
    }
  });
}

async function countStrategySnapshots(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  competitorId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("competitor_strategy_overview_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("competitor_id", competitorId);
  if (error) {
    console.warn("[comparison/payload] snapshot count", error.message);
    return 0;
  }
  return count ?? 0;
}

async function loadAudienceHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  competitorId: string,
  limit = 4
): Promise<Array<{ snapshotDate: string; primarySegmentName: string; primaryConfidence: number }>> {
  const { data, error } = await supabase
    .from("competitor_strategy_overview_snapshots")
    .select("computed_at, payload")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .order("computed_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const chronological = [...data].reverse();
  return chronological.map((row) => {
    const p = row.payload as CompetitorStrategyOverviewPayload | null;
    const ai = p?.audience_inference;
    const primary =
      ai?.segments?.find((s) => s.name === ai?.primarySegmentName) ?? ai?.segments?.[0];
    return {
      snapshotDate: row.computed_at,
      primarySegmentName: primary?.name ?? ai?.primarySegmentName ?? "—",
      primaryConfidence: typeof primary?.confidence === "number" ? primary.confidence : 0,
    };
  });
}

async function loadRecentMoves(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  competitorId: string,
  limit = 20
): Promise<ComparisonMoveRow[]> {
  const { data, error } = await supabase
    .from("competitor_moves")
    .select("id, event_type, significance, detected_at, platform, before_state, after_state, narrative")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .order("detected_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[comparison/payload] recent moves", error.message);
    return [];
  }
  return (data ?? []) as ComparisonMoveRow[];
}

function scheduleBackgroundRecompute(params: {
  competitorDomain: string;
  userId: string;
  competitorId: string;
  stealLock: boolean;
  refreshAdEnrichment: boolean;
}): void {
  const { competitorDomain, userId, competitorId, stealLock, refreshAdEnrichment } = params;
  after(async () => {
    try {
      const sb = await createSupabaseServerClient();
      const {
        data: { user: u2 },
      } = await sb.auth.getUser();
      if (!u2 || u2.id !== userId) return;
      const r = await recomputeStrategyOverviewForCompetitor({
        supabase: sb,
        userId,
        competitorId,
        domainHint: competitorDomain,
        stealLock,
        refreshAdEnrichment,
        staleLockMs: stealLock ? USER_STALE_LOCK_MS : undefined,
      });
      if (!r.ok) console.warn("[comparison/payload] background recompute:", r.error);
    } catch (e) {
      console.error("[comparison/payload] background recompute failed", e);
    }
  });
}

async function countActiveAdsForCompetitor(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
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
    console.warn("[comparison/payload] scraped_ads count", error.message);
    return 0;
  }
  return count ?? 0;
}

async function loadWorkspaceBrandRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  brandId?: string | null,
): Promise<Database["public"]["Tables"]["saved_competitors"]["Row"] | null> {
  const requested = brandId?.trim();
  if (requested && requested !== "default" && requested !== "_workspace") {
    const { data: brand } = await supabase
      .from("brands")
      .select("workspace_competitor_id")
      .eq("user_id", userId)
      .eq("id", requested)
      .maybeSingle();

    if (brand?.workspace_competitor_id) {
      const { data } = await supabase
        .from("saved_competitors")
        .select("*")
        .eq("user_id", userId)
        .eq("id", brand.workspace_competitor_id)
        .maybeSingle();
      if (data) return data;
    }
  }

  const { data } = await supabase
    .from("saved_competitors")
    .select("*")
    .eq("user_id", userId)
    .eq("is_workspace_brand", true)
    .maybeSingle();
  return data ?? null;
}

function metaFromSavedRow(
  row: Database["public"]["Tables"]["saved_competitors"]["Row"],
  domainFallback: string
): SideMeta {
  const domain = (row.brand_domain?.trim() || row.slug?.trim() || domainFallback).toLowerCase();
  return {
    competitorId: row.id,
    name: row.brand_name?.trim() || row.name,
    domain,
    logoUrl: row.brand_logo_url ?? row.logo_url,
    lastScrapedAt: row.last_scraped_at,
    lastMoveDetectionAt: row.last_move_detection_at ?? null,
  };
}

/**
 * Serve the best available payload immediately. Derivation runs in background on cache miss.
 */
async function resolveSidePayload(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  competitorId: string;
  domainHint: string;
}): Promise<{ payload: CompetitorStrategyOverviewPayload | null; recomputing: boolean }> {
  const { supabase, userId, competitorId, domainHint } = params;

  const fresh = await getCachedStrategyOverview(supabase, userId, competitorId, domainHint);
  if (fresh) {
    return { payload: fresh, recomputing: false };
  }

  const [stale, meta, scrapeIsNewer, running] = await Promise.all([
    getStaleStrategyOverviewPayload(supabase, userId, competitorId),
    loadSavedCompetitorForUser(supabase, userId, domainHint),
    scrapeIsNewerThanOverview(supabase, competitorId),
    isStrategyRecomputeRunning(supabase, competitorId),
  ]);

  let payload = stale;
  if (payload) {
    payload = mergeAudienceInference(payload, stale);
    if (meta) {
      payload = await hydrateAudienceInferenceIfReady(payload, {
        brandName: meta.name,
        brandDomain: meta.brandDomain ?? meta.cacheDomain,
      });
    }
  }

  const needsDerive = !payload && !running;
  const needsBackgroundRecompute = scrapeIsNewer && !running;

  if (needsDerive || needsBackgroundRecompute) {
    after(async () => {
      try {
        const sb = await createSupabaseServerClient();
        const {
          data: { user: u2 },
        } = await sb.auth.getUser();
        if (!u2 || u2.id !== userId) return;
        if (needsDerive) {
          await deriveAndPersistFastPathStrategyOverview({
            supabase: sb,
            userId,
            competitorId,
            domainHint,
          });
        }
        if (needsBackgroundRecompute) {
          const r = await recomputeStrategyOverviewForCompetitor({
            supabase: sb,
            userId,
            competitorId,
            domainHint,
            stealLock: false,
            refreshAdEnrichment: false,
          });
          if (!r.ok) console.warn("[comparison/payload] background recompute:", r.error);
        }
      } catch (e) {
        console.error("[comparison/payload] background derive/recompute failed", e);
      }
    });
  }

  return {
    payload,
    recomputing: running || needsDerive || needsBackgroundRecompute,
  };
}

function derivedStatsFromStrategyPayload(
  p: CompetitorStrategyOverviewPayload | null
): ComparisonDerivedStats | null {
  if (!p?.insights) return null;

  const angles = p.insights.angle_clustering?.angles ?? [];
  const velocity = p.insights.testing_velocity_by_platform ?? [];
  const formats = p.insights.ad_format_mix?.formats ?? [];

  let newIn30 = 0;
  let lifespanSum = 0;
  let lifespanN = 0;
  for (const v of velocity) {
    newIn30 += v.newIn30 ?? 0;
    if (typeof v.avgLifespanDays === "number") {
      lifespanSum += v.avgLifespanDays;
      lifespanN += 1;
    }
  }

  let videoCount = 0;
  let formatTotal = 0;
  for (const f of formats) {
    formatTotal += f.count ?? 0;
    if (/video/i.test(f.format ?? "")) videoCount += f.count ?? 0;
  }

  return {
    avgAdAgeDays: lifespanN > 0 ? Math.round(lifespanSum / lifespanN) : 0,
    newAdsLast30d: newIn30,
    videoPercent: formatTotal > 0 ? Math.round((videoCount / formatTotal) * 100) : 0,
    uniqueAnglesCount: angles.filter((a) => (a.angle ?? "").trim()).length,
  };
}

async function resolveDerivedStats(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  competitorId: string,
  payload: CompetitorStrategyOverviewPayload | null
): Promise<ComparisonDerivedStats> {
  const fromPayload = derivedStatsFromStrategyPayload(payload);
  if (fromPayload) return fromPayload;
  return computeScrapedAdsDerivedStats(supabase, userId, competitorId);
}

export async function GET(req: Request): Promise<NextResponse> {
    const session = await getRequestWorkspace();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = session;

  const url = new URL(req.url);
  const competitorDomain = (url.searchParams.get("competitorDomain") ?? url.searchParams.get("domain") ?? "").trim();
  const brandId = url.searchParams.get("brandId");
  if (!competitorDomain) {
    return NextResponse.json({ ok: false, error: "competitorDomain required" }, { status: 400 });
  }

  const wsRow = await loadWorkspaceBrandRow(supabase, dataUserId, brandId);
  if (!wsRow) {
    return NextResponse.json(
      { ok: false, error: "Workspace brand not configured. Complete onboarding or link a workspace competitor." },
      { status: 404 }
    );
  }

  const wsDomainHint = (wsRow.brand_domain?.trim() || wsRow.slug || "").toLowerCase();
  const wsMeta = metaFromSavedRow(wsRow, wsDomainHint || "workspace");

  if (!ctx.isViewer) {
    await ensureSavedCompetitorForStrategyOverview(supabase, dataUserId, competitorDomain);
  }
  const rivalMeta = await loadSavedCompetitorForUser(supabase, dataUserId, competitorDomain);
  if (!rivalMeta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const [activeWsAds, wsResolved, rivalResolved] = await Promise.all([
    countActiveAdsForCompetitor(supabase, dataUserId, wsRow.id),
    resolveSidePayload({
      supabase,
      userId: dataUserId,
      competitorId: wsRow.id,
      domainHint: wsDomainHint || wsMeta.domain,
    }),
    resolveSidePayload({
      supabase,
      userId: dataUserId,
      competitorId: rivalMeta.competitorId,
      domainHint: rivalMeta.brandDomain ?? rivalMeta.cacheDomain,
    }),
  ]);

  const needsScrape = activeWsAds === 0;

  const rivalSideMeta: SideMeta = {
    competitorId: rivalMeta.competitorId,
    name: rivalMeta.name,
    domain: (rivalMeta.brandDomain ?? rivalMeta.cacheDomain).toLowerCase(),
    logoUrl: rivalMeta.logoUrl,
    lastScrapedAt: rivalMeta.lastScrapedAt,
    lastMoveDetectionAt: rivalMeta.lastMoveDetectionAt,
  };

  if (!ctx.isViewer) {
    scheduleMoveDetection({
      userId: dataUserId,
      workspaceId: wsRow.id,
      rivalId: rivalMeta.competitorId,
    });
  }

  const [
    wsMoves,
    rivalMoves,
    wsSnapCount,
    rivalSnapCount,
    wsDerived,
    rivalDerived,
    wsAudienceHistory,
    rivalAudienceHistory,
  ] = await Promise.all([
    loadRecentMoves(supabase, dataUserId, wsRow.id),
    loadRecentMoves(supabase, dataUserId, rivalMeta.competitorId),
    countStrategySnapshots(supabase, dataUserId, wsRow.id),
    countStrategySnapshots(supabase, dataUserId, rivalMeta.competitorId),
    resolveDerivedStats(supabase, dataUserId, wsRow.id, wsResolved.payload),
    resolveDerivedStats(supabase, dataUserId, rivalMeta.competitorId, rivalResolved.payload),
    loadAudienceHistory(supabase, dataUserId, wsRow.id),
    loadAudienceHistory(supabase, dataUserId, rivalMeta.competitorId),
  ]);

  const workspace: ComparisonSideResponse = {
    meta: wsMeta,
    payload: wsResolved.payload,
    recomputing: wsResolved.recomputing,
    recent_moves: wsMoves,
    snapshot_count: wsSnapCount,
    audienceHistory: wsAudienceHistory,
    derivedStats: wsDerived,
    ...(needsScrape ? { needsScrape: true } : {}),
  };

  const competitor: ComparisonSideResponse = {
    meta: rivalSideMeta,
    payload: rivalResolved.payload,
    recomputing: rivalResolved.recomputing,
    recent_moves: rivalMoves,
    snapshot_count: rivalSnapCount,
    audienceHistory: rivalAudienceHistory,
    derivedStats: rivalDerived,
  };

  return NextResponse.json({
    ok: true,
    workspace,
    competitor,
  }, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
}
