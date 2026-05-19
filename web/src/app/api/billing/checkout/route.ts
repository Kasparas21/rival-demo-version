import { NextResponse, type NextRequest } from "next/server";
import { TrialInterval } from "@polar-sh/sdk/models/components/trialinterval";
import { ensureUserProfile } from "@/lib/auth/profile";
import { getAppUrl, polarProductIdForPlan, type PolarPlanSlug } from "@/lib/billing/config";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { createPolarClient } from "@/lib/billing/polar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function createCheckoutRedirect(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("next", "/api/billing/checkout");
    return NextResponse.redirect(loginUrl);
  }

  await ensureUserProfile(supabase, user);

  const billing = await getBillingEntitlement(supabase, user.id);
  if (billing.isUnlimited) {
    return NextResponse.redirect(new URL("/dashboard/spy", request.nextUrl.origin));
  }

  const planParam = request.nextUrl.searchParams.get("plan")?.trim().toLowerCase();
  const plan: PolarPlanSlug = planParam === "starter" ? "starter" : "pro";
  const productId = polarProductIdForPlan(plan);
  const appUrl = getAppUrl();
  const polar = createPolarClient();
  const checkout = await polar.checkouts.create({
    products: [productId],
    externalCustomerId: user.id,
    customerEmail: user.email ?? undefined,
    customerMetadata: {
      user_id: user.id,
    },
    metadata: {
      user_id: user.id,
      source: "rival_checkout",
      plan,
    },
    allowTrial: true,
    trialInterval: TrialInterval.Day,
    trialIntervalCount: 7,
    successUrl: `${appUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
    returnUrl: `${appUrl}/dashboard/settings`,
  });

  return NextResponse.redirect(checkout.url);
}

export async function GET(request: NextRequest) {
  try {
    return await createCheckoutRedirect(request);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create checkout.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
