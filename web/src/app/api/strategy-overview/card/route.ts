import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadSavedCompetitorForUser } from "@/lib/strategy-overview/recompute-strategy-overview";
import type { StrategyInsightCardType } from "@/lib/strategy-overview/payload-types";

const CARD_TYPES = new Set<string>([
  "funnel_architecture",
  "budget_allocation",
  "creative_cadence",
  "audience_signal_map",
  "angle_clustering",
  "voice_tone_fingerprint",
  "performance_pulse",
]);

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const domain = (url.searchParams.get("competitorDomain") ?? url.searchParams.get("domain") ?? "").trim();
  const cardType = (url.searchParams.get("type") ?? "").trim();

  if (!domain || !cardType || !CARD_TYPES.has(cardType)) {
    return NextResponse.json({ ok: false, error: "competitorDomain and valid type required" }, { status: 400 });
  }

  const meta = await loadSavedCompetitorForUser(supabase, user.id, domain);
  if (!meta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: row } = await supabase
    .from("strategy_insights_cards")
    .select("payload, generated_at")
    .eq("competitor_id", meta.competitorId)
    .eq("user_id", user.id)
    .eq("card_type", cardType)
    .maybeSingle();

  if (!row?.payload) {
    return NextResponse.json({ ok: false, error: "Card not found — run recompute first" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    cardType: cardType as StrategyInsightCardType,
    generatedAt: row.generated_at,
    payload: row.payload,
    drillDownNote: "Extended breakdown uses cached strategy_insights_cards.payload only in v1.",
  });
}
