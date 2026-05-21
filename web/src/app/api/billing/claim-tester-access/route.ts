import { NextResponse, type NextRequest } from "next/server";

import { polarProductIdForPlan } from "@/lib/billing/config";
import {
  getTesterInviteCodeFromRequest,
  recordTesterInviteRedemption,
  validateTesterInviteAccess,
} from "@/lib/billing/tester-invite";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Complimentary Pro for valid tester invites when Polar checkout still asks for a card. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const inviteCode = getTesterInviteCodeFromRequest(request);
  const admin = createSupabaseAdminClient();
  const status = await validateTesterInviteAccess(admin, {
    inviteCode,
    userId: user.id,
  });

  if (!status.valid || !status.inviteCode) {
    return NextResponse.json(
      { ok: false, error: status.reason ?? "invalid_invite" },
      { status: 403 },
    );
  }

  const proProductId = polarProductIdForPlan("pro");
  const rawPayload = {
    admin_unlimited: true,
    dev_plan_override: "pro",
    tester_invite: status.inviteCode,
    tester_claim_source: "complimentary",
  } satisfies Record<string, unknown>;

  const { error: upsertErr } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: user.id,
      polar_product_id: proProductId,
      polar_product_name: "Tester Pro (complimentary)",
      status: "active",
      raw_payload: rawPayload as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertErr) {
    return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
  }

  await recordTesterInviteRedemption(admin, {
    inviteCode: status.inviteCode,
    userId: user.id,
    polarSubscriptionId: null,
  });

  return NextResponse.json({ ok: true, planTier: "pro" });
}
