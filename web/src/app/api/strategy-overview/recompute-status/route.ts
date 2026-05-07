import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import { getRecomputeLockRow, loadSavedCompetitorForUser } from "@/lib/strategy-overview/recompute-strategy-overview";

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

  if (!domain) {
    return NextResponse.json({ ok: false, error: "competitorDomain required" }, { status: 400 });
  }

  await ensureSavedCompetitorForStrategyOverview(supabase, user.id, domain);

  const meta = await loadSavedCompetitorForUser(supabase, user.id, domain);
  if (!meta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const row = await getRecomputeLockRow(supabase, meta.competitorId);

  let status: "idle" | "running" | "failed" = "idle";
  if (row?.status === "running") {
    const until = row.locked_until ? Date.parse(row.locked_until) : NaN;
    const started = row.locked_at ? Date.parse(row.locked_at) : NaN;
    const lockExpired = Number.isFinite(until) && until <= Date.now();
    const lockTooOld = Number.isFinite(started) && Date.now() - started > 900_000;
    if (lockExpired || lockTooOld) {
      status = "idle";
    } else {
      status = "running";
    }
  } else if (row?.status === "failed") {
    status = "failed";
  }

  return NextResponse.json({
    ok: true,
    status,
    startedAt: row?.locked_at ?? null,
    completedAt: row?.completed_at ?? null,
    enrichedAds: row?.enriched_ads ?? null,
    totalAds: row?.total_ads ?? null,
    error: row?.last_error ?? null,
  });
}
