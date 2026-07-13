import { NextResponse, type NextRequest } from "next/server";
import type { CheckoutCreate } from "@polar-sh/sdk/models/components/checkoutcreate";
import { TrialInterval } from "@polar-sh/sdk/models/components/trialinterval";
import { ensureUserProfile } from "@/lib/auth/profile";
import {
  buildPolarCheckoutBrowserMetadata,
  polarCheckoutBrowserMetadataForApi,
} from "@/lib/analytics/polar-checkout-metadata";
import { appOriginForRequest } from "@/lib/auth/auth-link-origin";
import { getPolarCustomProductId, getPolarTesterDiscountId, type PolarPlanSlug } from "@/lib/billing/config";
import { activateComplimentaryCustomQuote } from "@/lib/billing/activate-complimentary-quote";
import { getCustomQuoteByToken, isComplimentaryQuote } from "@/lib/billing/custom-quotes";
import { resolvePolarCustomCheckout } from "@/lib/billing/polar-custom-checkout";
import { resolvePolarCheckoutProducts } from "@/lib/billing/polar-checkout";
import {
  buildAwaitingQuoteHref,
  buildCheckoutHref,
  buildPolarCheckoutReturnUrl,
  parseCheckoutPeriod,
  safeCheckoutNextPath,
} from "@/lib/billing/checkout-url";
import { getBillingEntitlement, hasActivePaidSubscription } from "@/lib/billing/entitlements";
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
    buildAwaitingQuoteHref(safeCheckoutNextPath(request.nextUrl.searchParams.get("next"))),
    request.nextUrl.origin,
  );
  returnUrl.searchParams.set("checkout_error", message);
  return NextResponse.redirect(returnUrl);
}

function loginNextForCheckoutRequest(request: NextRequest): string {
  const quote = request.nextUrl.searchParams.get("quote")?.trim();
  if (quote) {
    const params = new URLSearchParams({ quote });
    const next = safeCheckoutNextPath(request.nextUrl.searchParams.get("next"));
    if (next) params.set("next", next);
    return `/checkout?${params.toString()}`;
  }
  return buildAwaitingQuoteHref(safeCheckoutNextPath(request.nextUrl.searchParams.get("next")));
}

async function createCustomQuoteCheckout(
  request: NextRequest,
  wantsJson: boolean,
  user: { id: string; email?: string | null },
  quoteToken: string,
) {
  const admin = createSupabaseAdminClient();
  const quote = await getCustomQuoteByToken(admin, quoteToken);
  if (!quote) {
    return checkoutBrowserFailure(request, wantsJson, "This checkout link is invalid or has expired.", 404);
  }
  if (quote.user_id !== user.id) {
    return checkoutBrowserFailure(request, wantsJson, "This checkout link belongs to another account.", 403);
  }

  if (isComplimentaryQuote(quote)) {
    const activation = await activateComplimentaryCustomQuote(admin, quote, user.id);
    if (!activation.ok) {
      return checkoutBrowserFailure(request, wantsJson, activation.error, 500);
    }

    const next = safeCheckoutNextPath(request.nextUrl.searchParams.get("next"));
    const destination = next ?? "/dashboard/spy";
    if (wantsJson) {
      return NextResponse.json({ ok: true, redirect: destination, complimentary: true });
    }
    return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const billing = await getBillingEntitlement(supabase, user.id);
  if (hasActivePaidSubscription(billing)) {
    const portalUrl = new URL("/api/billing/portal", request.nextUrl.origin);
    return NextResponse.redirect(portalUrl);
  }

  const appUrl = appOriginForRequest(request);
  const polar = createPolarClient();
  const browserMetadata = polarCheckoutBrowserMetadataForApi(buildPolarCheckoutBrowserMetadata(request));
  const polarCheckout = await resolvePolarCustomCheckout(polar, quote);

  const trialDays = Math.max(0, quote.trial_days ?? 0);
  let checkoutBody: CheckoutCreate = {
    ...polarCheckout,
    externalCustomerId: user.id,
    ...(shouldPrefillPolarCustomerEmail(user.email)
      ? { customerEmail: user.email!.trim() }
      : {}),
    customerMetadata: {
      user_id: user.id,
    },
    metadata: {
      user_id: user.id,
      source: "rival_custom_quote",
      quote_id: quote.id,
      billing_period: quote.billing_period,
      price_cents: String(quote.price_cents),
      ...browserMetadata,
    },
    allowTrial: trialDays > 0,
    ...(trialDays > 0
      ? {
          trialInterval: TrialInterval.Day,
          trialIntervalCount: trialDays,
        }
      : {}),
    successUrl: `${appUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
    returnUrl: buildPolarCheckoutReturnUrl(
      appUrl,
      safeCheckoutNextPath(request.nextUrl.searchParams.get("next")),
    ),
  };

  await admin
    .from("custom_quotes")
    .update({
      polar_product_id: getPolarCustomProductId(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", quote.id);

  const checkout = await polar.checkouts.create(checkoutBody);

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "checkout_created",
      properties: {
        user_id: user.id,
        quote_id: quote.id,
        price_cents: quote.price_cents,
        billing_period: quote.billing_period,
        is_custom_quote: true,
      },
    });
  }

  if (wantsJson) {
    return NextResponse.json({ ok: true, url: checkout.url });
  }
  return NextResponse.redirect(checkout.url);
}

async function createTesterCheckout(
  request: NextRequest,
  wantsJson: boolean,
  user: { id: string; email?: string | null },
) {
  const plan: PolarPlanSlug = "pro";
  const period = "monthly";
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

  const testerInviteCode = await resolveTesterInviteCodeForUser(user.id, request);
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
        is_tester_invite: true,
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

async function createCheckoutRedirect(request: NextRequest) {
  const wantsJson = request.nextUrl.searchParams.get("intent") === "json";
  const quoteToken = request.nextUrl.searchParams.get("quote")?.trim();
  const isTesterCheckout = isTesterInviteCheckoutRequest(request);

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

  if (quoteToken) {
    return createCustomQuoteCheckout(request, wantsJson, user, quoteToken);
  }

  if (isTesterCheckout) {
    return createTesterCheckout(request, wantsJson, user);
  }

  if (wantsJson) {
    return NextResponse.json(
      { ok: false, error: "A custom quote checkout link is required." },
      { status: 400 },
    );
  }
  return NextResponse.redirect(
    new URL(buildAwaitingQuoteHref(safeCheckoutNextPath(request.nextUrl.searchParams.get("next"))), request.nextUrl.origin),
  );
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
