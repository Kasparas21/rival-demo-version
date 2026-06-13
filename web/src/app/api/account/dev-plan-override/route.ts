import { NextResponse } from "next/server";
import {
  getBillingEntitlement,
  isDevPlanOverrideEnabled,
  type DevPlanOverride,
} from "@/lib/billing/entitlements";
import { normalizePlanTier } from "@/lib/billing/plan-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const VALID_OVERRIDES: DevPlanOverride[] = ["free_trial", "starter", "pro", "agency", "admin"];

function isManualAdminUnlimited(rawPayload: unknown): boolean {
  return (
    typeof rawPayload === "object" &&
    rawPayload !== null &&
    "admin_unlimited" in rawPayload &&
    (rawPayload as { admin_unlimited?: unknown }).admin_unlimited === true
  );
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.canUseDevPlanSwitcher) {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    enabled: true,
    currentTier: billing.planTier,
    devPlanOverride: billing.devPlanOverride,
    options: VALID_OVERRIDES,
  });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.canUseDevPlanSwitcher && !isDevPlanOverrideEnabled()) {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 403 });
  }

  let plan: DevPlanOverride | null = null;
  try {
    const body = (await req.json()) as { plan?: string | null };
    if (body.plan === null || body.plan === "") {
      plan = null;
    } else {
      const normalized = normalizePlanTier(body.plan);
      if (!normalized || !VALID_OVERRIDES.includes(normalized)) {
        return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });
      }
      plan = normalized;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("billing_subscriptions")
    .select("raw_payload, polar_product_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const basePayload =
    typeof existing?.raw_payload === "object" && existing.raw_payload !== null && !Array.isArray(existing.raw_payload)
      ? { ...(existing.raw_payload as Record<string, unknown>) }
      : {};

  if (plan === null) {
    delete basePayload.dev_plan_override;
  } else {
    basePayload.dev_plan_override = plan;
  }

  if (!isManualAdminUnlimited(basePayload) && billing.canUseDevPlanSwitcher) {
    basePayload.admin_unlimited = true;
  }

  const polarProductId = existing?.polar_product_id ?? "dev-override";

  const { error } = await supabase.from("billing_subscriptions").upsert(
    {
      user_id: user.id,
      polar_product_id: polarProductId,
      status: plan === "free_trial" || plan === null ? "none" : "active",
      raw_payload: basePayload as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const updated = await getBillingEntitlement(supabase, user.id);
  return NextResponse.json({
    ok: true,
    planTier: updated.planTier,
    devPlanOverride: updated.devPlanOverride,
    hasAccess: updated.hasAccess,
    limits: updated.limits,
  });
}
