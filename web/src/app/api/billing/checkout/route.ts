import { NextResponse } from "next/server";
import { TrialInterval } from "@polar-sh/sdk/models/components/trialinterval";
import { ensureUserProfile } from "@/lib/auth/profile";
import { getAppUrl, getPolarEnv } from "@/lib/billing/config";
import { createPolarClient } from "@/lib/billing/polar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function createCheckoutRedirect() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", getAppUrl());
    loginUrl.searchParams.set("next", "/api/billing/checkout");
    return NextResponse.redirect(loginUrl);
  }

  await ensureUserProfile(supabase, user);

  const { productId } = getPolarEnv();
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
    },
    allowTrial: true,
    trialInterval: TrialInterval.Day,
    trialIntervalCount: 1,
    successUrl: `${appUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
    returnUrl: `${appUrl}/dashboard/settings`,
  });

  return NextResponse.redirect(checkout.url);
}

export async function GET() {
  try {
    return await createCheckoutRedirect();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create checkout.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
