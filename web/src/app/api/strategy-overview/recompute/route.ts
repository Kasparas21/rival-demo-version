import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import {
  loadSavedCompetitorForUser,
  recomputeStrategyOverviewForCompetitor,
} from "@/lib/strategy-overview/recompute-strategy-overview";

export const runtime = "nodejs";
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

  /** User-triggered rebuild: take over any stale lock and re-run OpenRouter on every ad. */
  const result = await recomputeStrategyOverviewForCompetitor({
    supabase,
    userId: user.id,
    competitorId: meta.competitorId,
    domainHint: domain,
    stealLock: true,
    refreshAdEnrichment: true,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.error.includes("progress") ? 409 : 500 });
  }

  return NextResponse.json({ ok: true, payload: result.payload });
}
