import { NextResponse } from "next/server";
import { getBillingEntitlement, hasActivePaidSubscription } from "@/lib/billing/entitlements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST — permanently delete the authenticated user and cascaded workspace data. */
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

  const billing = await getBillingEntitlement(supabase, user.id);
  if (
    hasActivePaidSubscription(billing) &&
    !billing.cancelAtPeriodEnd &&
    billing.planTier !== "admin"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Cancel your subscription first (Manage subscription in Settings), then delete your account.",
      },
      { status: 409 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, redirect: "/login" });
}
