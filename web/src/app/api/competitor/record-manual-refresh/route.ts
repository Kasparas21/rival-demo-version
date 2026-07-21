import { NextResponse } from "next/server";

import {
  billingRequiredResponseBody,
  featureNotAvailableResponseBody,
  getBillingEntitlement,
} from "@/lib/billing/entitlements";
import {
  canPerformManualRefresh,
  loadManualRefreshUsageForCompetitor,
} from "@/lib/billing/usage-quotas";
import { assertCanScrape, permissionDeniedResponse } from "@/lib/team/permissions";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Record Pro manual refresh quota after a client-triggered `/api/ads/library` scrape succeeds. */
export async function POST(req: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  try {
    assertCanScrape(ctx);
  } catch (err) {
    return permissionDeniedResponse(err);
  }

  let competitorId = "";
  try {
    const body = (await req.json()) as { competitorId?: string };
    competitorId = (body.competitorId ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const billing = await getBillingEntitlement(supabase, dataUserId);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Start your subscription to refresh competitor ads.", "pro"),
      { status: 402 },
    );
  }
  if (!billing.limits.allowManualRefresh && !billing.isUnlimited) {
    return NextResponse.json(featureNotAvailableResponseBody("Manual refresh"), { status: 403 });
  }

  const manualUsage = await loadManualRefreshUsageForCompetitor(supabase, dataUserId, competitorId);
  const manualCheck = canPerformManualRefresh(billing, manualUsage);
  if (!manualCheck.ok) {
    return NextResponse.json({ ok: false, error: manualCheck.error }, { status: manualCheck.status });
  }

  if (!billing.isUnlimited) {
    const { error } = await supabase.rpc("record_manual_refresh_usage", {
      p_competitor_id: competitorId,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
