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
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCanScrape, permissionDeniedResponse } from "@/lib/team/permissions";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Record Pro manual refresh quota after a client-triggered `/api/ads/library` scrape succeeds. */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  try {
    assertCanScrape(ctx);
  } catch (err) {
    return permissionDeniedResponse(err);
  }
  const dataUserId = ctx.dataUserId;

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
