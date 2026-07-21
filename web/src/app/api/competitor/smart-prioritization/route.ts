import { NextResponse } from "next/server";
import { featureNotAvailableResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export async function PATCH(req: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const billing = await getBillingEntitlement(supabase, dataUserId);
  if (!billing.limits.canDisableSmartPrioritization && !billing.isUnlimited) {
    return NextResponse.json(
      featureNotAvailableResponseBody("Disabling Smart Prioritization"),
      { status: 403 },
    );
  }

  let competitorId: string;
  let disabled: boolean;
  try {
    const body = (await req.json()) as { competitorId?: string; disabled?: boolean };
    competitorId = (body.competitorId ?? "").trim();
    disabled = Boolean(body.disabled);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_competitors")
    .update({ smart_prioritization_disabled: disabled, updated_at: new Date().toISOString() })
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .select("id, smart_prioritization_disabled")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    competitorId: data.id,
    smartPrioritizationDisabled: data.smart_prioritization_disabled,
  });
}
