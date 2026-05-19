import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret || req.headers.get("authorization") !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: resetAds, error: resetErr } = await supabase
    .from("scraped_ads")
    .update({ ai_enrichment_status: "pending" })
    .in("ai_enrichment_status", ["failed"])
    .select("id, competitor_id");

  if (resetErr) {
    return NextResponse.json({ step: "reset_ads", error: resetErr.message }, { status: 500 });
  }

  const affectedCompetitors = Array.from(new Set((resetAds ?? []).map((a) => a.competitor_id)));

  if (affectedCompetitors.length > 0) {
    const { error: overviewErr } = await supabase
      .from("competitor_strategy_overview")
      .delete()
      .in("competitor_id", affectedCompetitors);

    if (overviewErr) {
      return NextResponse.json({ step: "clear_overview", error: overviewErr.message }, { status: 500 });
    }

    const { error: comparisonErr } = await supabase
      .from("brand_comparison_results")
      .delete()
      .in("competitor_id", affectedCompetitors);

    if (comparisonErr) {
      return NextResponse.json({ step: "clear_comparison", error: comparisonErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    ads_reset: resetAds?.length ?? 0,
    competitors_affected: affectedCompetitors.length,
    competitor_ids: affectedCompetitors,
    next_step:
      "Visit each affected competitor's page to trigger fresh recompute, OR wait for next weekly cron",
  });
}
