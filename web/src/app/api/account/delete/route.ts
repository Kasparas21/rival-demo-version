import { NextResponse } from "next/server";

import { deleteUserAccount } from "@/lib/admin/delete-user-account";
import { getPostHogServerClient, getPostHogDistinctId } from "@/lib/analytics/posthog-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST — permanently delete the authenticated user, Polar customer, and cascaded workspace data. */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { confirm?: unknown };
  try {
    body = (await req.json()) as { confirm?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { ok: false, error: 'Confirmation required. Send { "confirm": "DELETE" }.' },
      { status: 400 },
    );
  }

  const { data: billingRow } = await supabase
    .from("billing_subscriptions")
    .select("polar_customer_id, polar_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "account_deleted",
      properties: { user_id: user.id },
    });
  }

  const admin = createSupabaseAdminClient();
  const result = await deleteUserAccount({
    admin,
    userId: user.id,
    polarCustomerId: billingRow?.polar_customer_id,
    polarSubscriptionId: billingRow?.polar_subscription_id,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.stage === "polar" ? `Could not remove billing profile: ${result.error}` : result.error,
      },
      { status: result.stage === "polar" ? 502 : 500 },
    );
  }

  return NextResponse.json({ ok: true, redirect: "/login" });
}
