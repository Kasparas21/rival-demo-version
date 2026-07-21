import { NextResponse } from "next/server";

import {
  billingRequiredResponseBody,
  featureNotAvailableResponseBody,
  getBillingEntitlement,
} from "@/lib/billing/entitlements";
import { computeManualRefreshStatus } from "@/lib/billing/manual-refresh-status";
import { loadManualRefreshUsageForCompetitor } from "@/lib/billing/usage-quotas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

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
