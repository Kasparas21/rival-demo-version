import { NextResponse } from "next/server";

import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";
import {
  getCachedStrategyOverview,
  getStaleStrategyOverviewPayload,
  loadSavedCompetitorForUser,
} from "@/lib/strategy-overview/recompute-strategy-overview";
import { isStrategyRecomputeRunning } from "@/lib/strategy-overview/strategy-overview-display";

export const runtime = "nodejs";

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
  if (error) return 0;
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
  if (error) return [];
  return (data ?? []) as ComparisonMoveRow[];
}

/** Lightweight activity feed bootstrap — cache-only strategy payload, no full comparison derive. */
export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  const url = new URL(req.url);
  const competitorDomain = (url.searchParams.get("competitorDomain") ?? url.searchParams.get("domain") ?? "").trim();
  if (!competitorDomain) {
    return NextResponse.json({ ok: false, error: "competitorDomain required" }, { status: 400 });
  }

  const rivalMeta = await loadSavedCompetitorForUser(supabase, dataUserId, competitorDomain);
  if (!rivalMeta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const domainHint = rivalMeta.brandDomain ?? rivalMeta.cacheDomain;

  const [freshPayload, stalePayload, snapshotCount, recentMoves, recomputing] = await Promise.all([
    getCachedStrategyOverview(supabase, dataUserId, rivalMeta.competitorId, domainHint),
    getStaleStrategyOverviewPayload(supabase, dataUserId, rivalMeta.competitorId),
    countStrategySnapshots(supabase, dataUserId, rivalMeta.competitorId),
    loadRecentMoves(supabase, dataUserId, rivalMeta.competitorId),
    isStrategyRecomputeRunning(supabase, rivalMeta.competitorId),
  ]);

  const payload = freshPayload ?? stalePayload;

  return NextResponse.json(
    {
      ok: true,
      competitor: {
        meta: {
          competitorId: rivalMeta.competitorId,
          name: rivalMeta.name,
          domain: domainHint.toLowerCase(),
          logoUrl: rivalMeta.logoUrl,
          lastScrapedAt: rivalMeta.lastScrapedAt,
          lastMoveDetectionAt: rivalMeta.lastMoveDetectionAt,
        },
        payload,
        snapshot_count: snapshotCount,
        recent_moves: recentMoves,
        recomputing,
      },
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
