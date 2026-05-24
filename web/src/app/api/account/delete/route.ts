import { NextResponse } from "next/server";
import { deletePolarCustomerForUser } from "@/lib/billing/delete-polar-customer";
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

  const polarResult = await deletePolarCustomerForUser({
    userId: user.id,
    polarCustomerId: billingRow?.polar_customer_id,
    polarSubscriptionId: billingRow?.polar_subscription_id,
  });

  if (!polarResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Could not remove billing profile: ${polarResult.error}`,
      },
      { status: 502 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, redirect: "/login" });
}
