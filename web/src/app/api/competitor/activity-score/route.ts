import { NextResponse } from "next/server";

import { computeActivityScore } from "@/lib/activity-score/compute";
import { scheduleActivityScoreRecompute } from "@/lib/activity-score/schedule-recompute";
import type { ActivityScoreResult, ActivitySignalName } from "@/lib/activity-score/types";
import { SIGNAL_WEIGHTS as W } from "@/lib/activity-score/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_MS = 7 * 86400000;

type ScoreRow = Database["public"]["Tables"]["competitor_activity_scores"]["Row"];

function rowToResult(row: ScoreRow): ActivityScoreResult {
  const s1 = row.signal_production_value;
  const s2 = row.signal_creative_diversity;
  const s3 = row.signal_refresh_velocity;
  const s4 = row.signal_format_sophistication;
  const s5 = row.signal_landing_infra;
  const s6 = row.signal_copy_sophistication;
  const s7 = row.signal_product_depth;
  const s8 = row.signal_activity_duration;

  const values: Record<ActivitySignalName, number> = {
    production_value: s1,
    creative_diversity: s2,
    refresh_velocity: s3,
    format_sophistication: s4,
    landing_infra: s5,
    copy_sophistication: s6,
    product_depth: s7,
    activity_duration: s8,
  };

  const signals = {} as ActivityScoreResult["signals"];
  (Object.keys(W) as ActivitySignalName[]).forEach((k) => {
    const score = values[k];
    const weight = W[k];
    signals[k] = { score, weight, contribution: score * weight };
  });

  const reasons = row.reasons_top;
  const topReasons = Array.isArray(reasons)
    ? (reasons as ActivityScoreResult["topReasons"])
    : [];

  return {
    score: row.score,
    tier: row.tier as ActivityScoreResult["tier"],
    tierLabel: row.tier_label,
    spendRange: { min: row.spend_range_min, max: row.spend_range_max },
    signals,
    topReasons,
    confidence: row.confidence as ActivityScoreResult["confidence"],
    adsCount: row.ads_count_at_calc,
    rawMetrics:
      row.raw_metrics && typeof row.raw_metrics === "object" && !Array.isArray(row.raw_metrics)
        ? (row.raw_metrics as Record<string, unknown>)
        : {},
  };
}

export type ActivityScoreApiBody = ActivityScoreResult & {
  calculatedAt: string | null;
  staleRefreshing?: boolean;
};

export async function GET(
  request: Request
): Promise<NextResponse<{ ok: boolean; error?: string } & Partial<ActivityScoreApiBody>>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const competitorId = searchParams.get("competitorId");
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .single();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const { data: row, error: rowErr } = await supabase
    .from("competitor_activity_scores")
    .select("*")
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
  }

  if (row) {
    const calculatedAt = row.calculated_at;
    const age = Date.now() - new Date(calculatedAt).getTime();
    if (age > CACHE_MS) {
      scheduleActivityScoreRecompute(user.id, competitorId);
      return NextResponse.json({
        ok: true,
        ...rowToResult(row),
        calculatedAt,
        staleRefreshing: true,
      });
    }
    return NextResponse.json({
      ok: true,
      ...rowToResult(row),
      calculatedAt,
    });
  }

  const admin = createSupabaseAdminClient();
  const fresh = await computeActivityScore({
    userId: user.id,
    competitorId,
    supabaseAdmin: admin,
  });

  return NextResponse.json({
    ok: true,
    ...fresh,
    calculatedAt: new Date().toISOString(),
  });
}

export async function POST(
  request: Request
): Promise<NextResponse<{ ok: boolean; error?: string } & Partial<ActivityScoreApiBody>>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let competitorId: string | null = null;
  try {
    const body = (await request.json()) as { competitorId?: string };
    competitorId = body.competitorId?.trim() ?? null;
  } catch {
    competitorId = null;
  }
  if (!competitorId) {
    const { searchParams } = new URL(request.url);
    competitorId = searchParams.get("competitorId");
  }
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .single();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const fresh = await computeActivityScore({
    userId: user.id,
    competitorId,
    supabaseAdmin: admin,
  });

  return NextResponse.json({
    ok: true,
    ...fresh,
    calculatedAt: new Date().toISOString(),
  });
}
