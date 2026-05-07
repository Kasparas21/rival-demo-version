import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/config";
import { createPolarClient } from "@/lib/billing/polar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: billing } = await supabase
      .from("billing_subscriptions")
      .select("polar_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const appUrl = getAppUrl();
    const returnUrl = `${appUrl}/dashboard/settings`;
    const session = billing?.polar_customer_id
      ? await createPolarClient().customerSessions.create({
          customerId: billing.polar_customer_id,
          returnUrl,
        })
      : await createPolarClient().customerSessions.create({
          externalCustomerId: user.id,
          returnUrl,
        });

    return NextResponse.redirect(session.customerPortalUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not open the billing portal.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
