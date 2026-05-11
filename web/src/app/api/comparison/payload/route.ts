import { after } from "next/server";
import { NextResponse } from "next/server";

import { maybeDetectMoves } from "@/lib/comparison/maybe-detect-moves";
import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
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
};

type ComparisonSideResponse = {
  meta: SideMeta;
  payload: CompetitorStrategyOverviewPayload | null;
  recomputing: boolean;
  needsScrape?: boolean;
  recent_moves: ComparisonMoveRow[];
  snapshot_count: number;
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
  userId: string
): Promise<Database["public"]["Tables"]["saved_competitors"]["Row"] | null> {
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
  };
}

/**
 * Fresh cache when possible; otherwise stale payload + background recompute (compiled-style).
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

  const stale = await getStaleStrategyOverviewPayload(supabase, userId, competitorId);
  if (stale) {
    scheduleBackgroundRecompute({
      competitorDomain: domainHint,
      userId,
      competitorId,
      stealLock: true,
      refreshAdEnrichment: true,
    });
    return { payload: stale, recomputing: true };
  }

  scheduleBackgroundRecompute({
    competitorDomain: domainHint,
    userId,
    competitorId,
    stealLock: true,
    refreshAdEnrichment: true,
  });
  return { payload: null, recomputing: true };
}

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const competitorDomain = (url.searchParams.get("competitorDomain") ?? url.searchParams.get("domain") ?? "").trim();
  if (!competitorDomain) {
    return NextResponse.json({ ok: false, error: "competitorDomain required" }, { status: 400 });
  }

  const wsRow = await loadWorkspaceBrandRow(supabase, user.id);
  if (!wsRow) {
    return NextResponse.json(
      { ok: false, error: "Workspace brand not configured. Complete onboarding or link a workspace competitor." },
      { status: 404 }
    );
  }

  const wsDomainHint = (wsRow.brand_domain?.trim() || wsRow.slug || "").toLowerCase();
  const wsMeta = metaFromSavedRow(wsRow, wsDomainHint || "workspace");
  const activeWsAds = await countActiveAdsForCompetitor(supabase, user.id, wsRow.id);
  const needsScrape = activeWsAds === 0;

  const wsResolved = await resolveSidePayload({
    supabase,
    userId: user.id,
    competitorId: wsRow.id,
    domainHint: wsDomainHint || wsMeta.domain,
  });

  await ensureSavedCompetitorForStrategyOverview(supabase, user.id, competitorDomain);
  const rivalMeta = await loadSavedCompetitorForUser(supabase, user.id, competitorDomain);
  if (!rivalMeta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const rivalSideMeta: SideMeta = {
    competitorId: rivalMeta.competitorId,
    name: rivalMeta.name,
    domain: (rivalMeta.brandDomain ?? rivalMeta.cacheDomain).toLowerCase(),
    logoUrl: rivalMeta.logoUrl,
    lastScrapedAt: rivalMeta.lastScrapedAt,
  };

  const rivalResolved = await resolveSidePayload({
    supabase,
    userId: user.id,
    competitorId: rivalMeta.competitorId,
    domainHint: rivalMeta.brandDomain ?? rivalMeta.cacheDomain,
  });

  scheduleMoveDetection({
    userId: user.id,
    workspaceId: wsRow.id,
    rivalId: rivalMeta.competitorId,
  });

  const [
    wsMoves,
    rivalMoves,
    wsSnapCount,
    rivalSnapCount,
  ] = await Promise.all([
    loadRecentMoves(supabase, user.id, wsRow.id),
    loadRecentMoves(supabase, user.id, rivalMeta.competitorId),
    countStrategySnapshots(supabase, user.id, wsRow.id),
    countStrategySnapshots(supabase, user.id, rivalMeta.competitorId),
  ]);

  const workspace: ComparisonSideResponse = {
    meta: wsMeta,
    payload: wsResolved.payload,
    recomputing: wsResolved.recomputing,
    recent_moves: wsMoves,
    snapshot_count: wsSnapCount,
    ...(needsScrape ? { needsScrape: true } : {}),
  };

  const competitor: ComparisonSideResponse = {
    meta: rivalSideMeta,
    payload: rivalResolved.payload,
    recomputing: rivalResolved.recomputing,
    recent_moves: rivalMoves,
    snapshot_count: rivalSnapCount,
  };

  return NextResponse.json({
    ok: true,
    workspace,
    competitor,
  });
}
