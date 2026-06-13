import { NextResponse, type NextRequest } from "next/server";
import type { CheckoutCreate } from "@polar-sh/sdk/models/components/checkoutcreate";
import { TrialInterval } from "@polar-sh/sdk/models/components/trialinterval";
import { ensureUserProfile } from "@/lib/auth/profile";
import {
  buildPolarCheckoutBrowserMetadata,
  polarCheckoutBrowserMetadataForApi,
} from "@/lib/analytics/polar-checkout-metadata";
import { appOriginForRequest } from "@/lib/auth/auth-link-origin";
import { getPolarTesterDiscountId, type PolarPlanSlug } from "@/lib/billing/config";
import { resolvePolarCheckoutProducts } from "@/lib/billing/polar-checkout";
import {
  buildCheckoutHref,
  buildChoosePlanHref,
  buildPolarCheckoutReturnUrl,
  parseCheckoutPeriod,
  safeCheckoutNextPath,
} from "@/lib/billing/checkout-url";
import { getBillingEntitlement, hasActivePaidSubscription } from "@/lib/billing/entitlements";
import { shouldRedirectCheckoutToUpgrade } from "@/lib/billing/upgrade-plan";
import {
  friendlyPolarCheckoutError,
  shouldPrefillPolarCustomerEmail,
} from "@/lib/billing/polar-checkout-email";
import { getPostHogServerClient, getPostHogDistinctId } from "@/lib/analytics/posthog-server";
import { createPolarClient } from "@/lib/billing/polar";
import {
  isTesterInviteCheckoutRequest,
  setTesterInviteCookie,
  testerInviteUnavailableMessage,
  validateTesterInviteAccess,
} from "@/lib/billing/tester-invite";
import { resolveTesterInviteCodeForUser } from "@/lib/billing/tester-invite-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function checkoutBrowserFailure(
  request: NextRequest,
  wantsJson: boolean,
  message: string,
  status = 500,
): NextResponse {
  if (wantsJson) {
    return NextResponse.json({ ok: false, error: message }, { status });
  }
  const returnUrl = new URL(
    buildChoosePlanHref(safeCheckoutNextPath(request.nextUrl.searchParams.get("next"))),
    request.nextUrl.origin,
  );
  returnUrl.searchParams.set("checkout_error", message);
  return NextResponse.redirect(returnUrl);
}

function loginNextForCheckoutRequest(request: NextRequest): string {
  const planParam = request.nextUrl.searchParams.get("plan")?.trim().toLowerCase();
  const plan: PolarPlanSlug =
    planParam === "starter"
      ? "starter"
      : planParam === "agency"
        ? "agency"
        : planParam === "pro"
          ? "pro"
          : "starter";
  const period = parseCheckoutPeriod(request.nextUrl.searchParams.get("period"));
  return buildCheckoutHref(plan, period, safeCheckoutNextPath(request.nextUrl.searchParams.get("next")));
}

async function createCheckoutRedirect(request: NextRequest) {
  const wantsJson = request.nextUrl.searchParams.get("intent") === "json";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("next", loginNextForCheckoutRequest(request));
    return NextResponse.redirect(loginUrl);
  }

  await ensureUserProfile(supabase, user);

  const billing = await getBillingEntitlement(supabase, user.id);
  if (billing.isUnlimited) {
    if (wantsJson) {
      return NextResponse.json({ ok: true, redirect: "/dashboard/spy" });
    }
    return NextResponse.redirect(new URL("/dashboard/spy", request.nextUrl.origin));
  }

  const isTesterCheckout = isTesterInviteCheckoutRequest(request);
  const planParam = request.nextUrl.searchParams.get("plan")?.trim().toLowerCase();
  const plan: PolarPlanSlug = isTesterCheckout
    ? "pro"
    : planParam === "starter"
      ? "starter"
      : planParam === "agency"
        ? "agency"
        : planParam === "pro"
          ? "pro"
          : "pro";
  const period = isTesterCheckout ? "monthly" : parseCheckoutPeriod(request.nextUrl.searchParams.get("period"));

  if (
    shouldRedirectCheckoutToUpgrade({
      requestedPlan: plan,
      planTier: billing.planTier,
      hasActivePaid: hasActivePaidSubscription(billing),
    })
  ) {
    const upgradeUrl = new URL("/api/billing/upgrade", request.nextUrl.origin);
    return NextResponse.redirect(upgradeUrl);
  }

  if (hasActivePaidSubscription(billing)) {
    const portalUrl = new URL("/api/billing/portal", request.nextUrl.origin);
    return NextResponse.redirect(portalUrl);
  }

  const appUrl = appOriginForRequest(request);
  const polar = createPolarClient();
  const browserMetadata = polarCheckoutBrowserMetadataForApi(buildPolarCheckoutBrowserMetadata(request));
  const polarProducts = await resolvePolarCheckoutProducts(polar, plan, period);

  let checkoutBody: CheckoutCreate = {
    ...polarProducts,
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
      ...browserMetadata,
    },
    allowTrial: true,
    trialInterval: TrialInterval.Day,
    trialIntervalCount: 7,
    successUrl: `${appUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
    returnUrl: buildPolarCheckoutReturnUrl(
      appUrl,
      safeCheckoutNextPath(request.nextUrl.searchParams.get("next")),
    ),
  };

  let testerInviteCode: string | null = null;

  if (isTesterCheckout) {
    testerInviteCode = await resolveTesterInviteCodeForUser(user.id, request);
    const admin = createSupabaseAdminClient();
    const inviteStatus = await validateTesterInviteAccess(admin, {
      inviteCode: testerInviteCode,
      userId: user.id,
    });

    if (!inviteStatus.valid || !inviteStatus.inviteCode) {
      const message = testerInviteUnavailableMessage(inviteStatus.reason);
      return checkoutBrowserFailure(request, wantsJson, message, 403);
    }

    const discountId = getPolarTesterDiscountId();
    if (!discountId) {
      return checkoutBrowserFailure(
        request,
        wantsJson,
        "Tester discount is not configured (POLAR_TESTER_DISCOUNT_ID).",
        503,
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
        ...browserMetadata,
      },
    };
  }

  const checkout = await polar.checkouts.create(checkoutBody);

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "checkout_created",
      properties: {
        user_id: user.id,
        plan,
        billing_period: period,
        is_tester_invite: isTesterCheckout,
      },
    });
  }

  if (wantsJson) {
    const out = NextResponse.json({ ok: true, url: checkout.url });
    if (testerInviteCode) {
      setTesterInviteCookie(out, testerInviteCode);
    }
    return out;
  }

  const redirect = NextResponse.redirect(checkout.url);
  if (testerInviteCode) {
    setTesterInviteCookie(redirect, testerInviteCode);
  }
  return redirect;
}

export async function GET(request: NextRequest) {
  try {
    return await createCheckoutRedirect(request);
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Could not create checkout.";
    return checkoutBrowserFailure(request, request.nextUrl.searchParams.get("intent") === "json", friendlyPolarCheckoutError(raw));
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
