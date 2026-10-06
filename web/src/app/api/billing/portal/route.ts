import { NextResponse, type NextRequest } from "next/server";
import { appOriginForRequest } from "@/lib/auth/auth-link-origin";
import { createPolarClient } from "@/lib/billing/polar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    const appUrl = appOriginForRequest(request);
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
    /** Comped and admin-granted plans have no Polar customer. Polar's error names our internal user id: log it, don't show it. */
    console.error("[billing/portal]", e instanceof Error ? e.message : e);
    const settings = new URL("/dashboard/settings", appOriginForRequest(request));
    settings.searchParams.set("billing_portal", "unavailable");
    return NextResponse.redirect(settings);
  }
}
