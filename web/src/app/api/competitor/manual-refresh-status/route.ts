import { NextResponse } from "next/server";

import {
  billingRequiredResponseBody,
  featureNotAvailableResponseBody,
  getBillingEntitlement,
} from "@/lib/billing/entitlements";
import { computeManualRefreshStatus } from "@/lib/billing/manual-refresh-status";
import { loadManualRefreshUsageForCompetitor } from "@/lib/billing/usage-quotas";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const url = new URL(req.url);
  const competitorId = (url.searchParams.get("competitorId") ?? "").trim();
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
    return NextResponse.json(billingRequiredResponseBody(), { status: 402 });
  }
  if (!billing.limits.allowManualRefresh && !billing.isUnlimited) {
    return NextResponse.json(featureNotAvailableResponseBody("Manual refresh"), { status: 403 });
  }

  const usage = await loadManualRefreshUsageForCompetitor(supabase, dataUserId, competitorId);
  const status = computeManualRefreshStatus(billing, usage);

  return NextResponse.json({ ok: true, ...status });
}
