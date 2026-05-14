import { NextResponse } from "next/server";

import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import { loadSavedCompetitorForUser } from "@/lib/strategy-overview/recompute-strategy-overview";

export const runtime = "nodejs";

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
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "40") || 40));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);

  if (!competitorDomain) {
    return NextResponse.json({ ok: false, error: "competitorDomain required" }, { status: 400 });
  }

  await ensureSavedCompetitorForStrategyOverview(supabase, user.id, competitorDomain);
  const meta = await loadSavedCompetitorForUser(supabase, user.id, competitorDomain);
  if (!meta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("competitor_moves")
    .select("id, event_type, significance, detected_at, platform, before_state, after_state, narrative")
    .eq("user_id", user.id)
    .eq("competitor_id", meta.competitorId)
    .order("detected_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    moves: (data ?? []) as ComparisonMoveRow[],
    competitorId: meta.competitorId,
  });
}
