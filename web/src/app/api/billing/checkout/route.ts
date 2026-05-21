import { NextResponse, type NextRequest } from "next/server";
import type { CheckoutCreate } from "@polar-sh/sdk/models/components/checkoutcreate";
import { TrialInterval } from "@polar-sh/sdk/models/components/trialinterval";
import { ensureUserProfile } from "@/lib/auth/profile";
import {
  getAppUrl,
  getPolarTesterDiscountId,
  polarProductIdForPlan,
  type PolarPlanSlug,
} from "@/lib/billing/config";
import { parseCheckoutPeriod } from "@/lib/billing/checkout-url";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  friendlyPolarCheckoutError,
  shouldPrefillPolarCustomerEmail,
} from "@/lib/billing/polar-checkout-email";
import { createPolarClient } from "@/lib/billing/polar";
import {
  getTesterInviteCodeFromRequest,
  isTesterInviteCheckoutRequest,
  validateTesterInviteAccess,
} from "@/lib/billing/tester-invite";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function createCheckoutRedirect(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  await ensureUserProfile(supabase, user);

  const billing = await getBillingEntitlement(supabase, user.id);
  if (billing.isUnlimited) {
    return NextResponse.redirect(new URL("/dashboard/spy", request.nextUrl.origin));
  }

  const isTesterCheckout = isTesterInviteCheckoutRequest(request);
  const planParam = request.nextUrl.searchParams.get("plan")?.trim().toLowerCase();
  const plan: PolarPlanSlug = isTesterCheckout ? "pro" : planParam === "starter" ? "starter" : "pro";
  const period = isTesterCheckout ? "monthly" : parseCheckoutPeriod(request.nextUrl.searchParams.get("period"));
  const productId = polarProductIdForPlan(plan, period);
  const appUrl = getAppUrl();
  const polar = createPolarClient();

  let checkoutBody: CheckoutCreate = {
    products: [productId],
    externalCustomerId: user.id,
    ...(shouldPrefillPolarCustomerEmail(user.email)
      ? { customerEmail: user.email!.trim() }
      : {}),
    customerMetadata: {
      user_id: user.id,
    },
    metadata: {
      user_id: user.id,
      source: "rival_checkout",
      plan,
      billing_period: period,
    },
    allowTrial: true,
    trialInterval: TrialInterval.Day,
    trialIntervalCount: 7,
    successUrl: `${appUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
    returnUrl: `${appUrl}/choose-plan`,
  };

  if (isTesterCheckout) {
    const inviteCode = getTesterInviteCodeFromRequest(request);
    const admin = createSupabaseAdminClient();
    const inviteStatus = await validateTesterInviteAccess(admin, {
      inviteCode,
      userId: user.id,
    });

    if (!inviteStatus.valid || !inviteStatus.inviteCode) {
      return NextResponse.json(
        { ok: false, error: inviteStatus.reason ?? "invalid_tester_invite" },
        { status: 403 },
      );
    }

    const discountId = getPolarTesterDiscountId();
    if (!discountId) {
      return NextResponse.json(
        { ok: false, error: "Tester discount is not configured (POLAR_TESTER_DISCOUNT_ID)." },
        { status: 503 },
      );
    }

    checkoutBody = {
      ...checkoutBody,
      allowTrial: false,
      allowDiscountCodes: false,
      discountId,
      metadata: {
        user_id: user.id,
        source: "rival_tester_invite",
        invite_code: inviteStatus.inviteCode,
        plan: "pro",
        billing_period: "monthly",
      },
    };
  }

  const checkout = await polar.checkouts.create(checkoutBody);

  return NextResponse.redirect(checkout.url);
}

export async function GET(request: NextRequest) {
  try {
    return await createCheckoutRedirect(request);
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Could not create checkout.";
    return NextResponse.json(
      { ok: false, error: friendlyPolarCheckoutError(raw) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
