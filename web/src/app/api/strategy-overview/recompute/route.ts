import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import {
  getRecomputeLockRow,
  loadSavedCompetitorForUser,
  recomputeStrategyOverviewForCompetitor,
} from "@/lib/strategy-overview/recompute-strategy-overview";

export const runtime = "nodejs";
/** Request ceiling; effective wall time is min(this, Vercel plan — Hobby ~10s). Long strategy recompute may need Pro+ or a queue. */
export const maxDuration = 300;

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Start your subscription to recompute strategy overviews."),
      { status: 402 }
    );
  }

  let body: { competitorDomain?: string; domain?: string; force?: boolean };
  try {
    body = (await req.json()) as { competitorDomain?: string; domain?: string; force?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const domain = (body.competitorDomain ?? body.domain ?? "").trim();
  if (!domain) {
    return NextResponse.json({ ok: false, error: "competitorDomain required" }, { status: 400 });
  }

  await ensureSavedCompetitorForStrategyOverview(supabase, user.id, domain);

  const meta = await loadSavedCompetitorForUser(supabase, user.id, domain);
  if (!meta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  /** User-triggered rebuild: `force` re-enriches all ads; default skips if already running. */
  const force = body.force === true;
  const runningRow = await getRecomputeLockRow(supabase, meta.competitorId);
  const running =
    runningRow?.status === "running" &&
    (runningRow.locked_until ? Date.parse(runningRow.locked_until) > Date.now() : false);

  if (!force && running) {
    return NextResponse.json(
      { ok: false, error: "Recompute already in progress for this competitor" },
      { status: 409 }
    );
  }

  const result = await recomputeStrategyOverviewForCompetitor({
    supabase,
    userId: user.id,
    competitorId: meta.competitorId,
    domainHint: domain,
    stealLock: force,
    refreshAdEnrichment: force,
    staleLockMs: force ? 90_000 : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.error.includes("progress") ? 409 : 500 });
  }

  return NextResponse.json({ ok: true, payload: result.payload });
}
