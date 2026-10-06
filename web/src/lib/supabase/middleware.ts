import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import {
  applyTesterInviteCookieFromRequest,
  matchesTesterInviteCode,
  TESTER_INVITE_COOKIE,
} from "@/lib/billing/tester-invite";
import {
  getBillingEntitlement,
  hasActivePaidSubscription,
  shouldShowPaywall,
} from "@/lib/billing/entitlements";
import { buildPaywallHref } from "@/lib/billing/paywall";
import { recordUserDailyActivity } from "@/lib/billing/user-activity";
import { TRIAL_PENDING_COOKIE } from "@/lib/auth/oauth-bridge-cookies";
import { PAYWALL_AFTER_TRIAL_PATH, shouldRedirectToTrialComplete } from "@/lib/auth/trial-flow";
import { hasPrePaymentSetup, POST_PAYMENT_ONBOARDING_PATH, resolveIncompleteOnboardingPath } from "@/lib/onboarding/phase";
import { getPublicSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * /dashboard and /onboarding require auth (redirect to /login?next=…).
 * Unauthenticated /api/* must not be redirected to /login (would break JSON) — short-circuit below.
 */
const PROTECTED_PATHS = ["/dashboard", "/onboarding", "/reset-password", "/api/account", "/admin"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];
const BILLING_EXEMPT_PREFIXES = ["/awaiting-quote", "/choose-plan", "/checkout", "/api/billing", "/auth/callback"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function clearTesterInviteCookie(response: NextResponse): void {
  response.cookies.set(TESTER_INVITE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function updateSession(request: NextRequest, event?: NextFetchEvent) {
  const testerParam = request.nextUrl.searchParams.get("tester")?.trim();
  if (testerParam && testerParam !== "1") {
    return applyTesterInviteCookieFromRequest(request, NextResponse.next({ request }));
  }

  let response = NextResponse.next({
    request,
  });
  const { supabaseUrl, supabasePublishableKey } = getPublicSupabaseEnv();

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isProtected = matchesPrefix(pathname, PROTECTED_PATHS);
  const isAuthPage = matchesPrefix(pathname, AUTH_PAGES);

  if (!user && isProtected) {
    if (pathname.startsWith("/api/")) {
      return response;
    }
    /** Guest trial funnel: allow /onboarding before signup. */
    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      return response;
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, company_url")
      .eq("id", user.id)
      .maybeSingle();
    const billing = await getBillingEntitlement(supabase, user.id);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = "";
    if (!profile?.onboarding_completed) {
      const nextParam = request.nextUrl.searchParams.get("next");
      const trialPending = request.cookies.get(TRIAL_PENDING_COOKIE)?.value;
      if (shouldRedirectToTrialComplete(nextParam, trialPending)) {
        const trialPlans = new URL(PAYWALL_AFTER_TRIAL_PATH, request.url);
        redirectUrl.pathname = trialPlans.pathname;
        redirectUrl.search = trialPlans.search;
        return NextResponse.redirect(redirectUrl);
      }
      if (hasPrePaymentSetup(profile) && shouldShowPaywall(billing)) {
        return NextResponse.redirect(new URL(buildPaywallHref(POST_PAYMENT_ONBOARDING_PATH), request.url));
      }
      const target = new URL(resolveIncompleteOnboardingPath(profile, billing, "/dashboard/spy"), request.url);
      redirectUrl.pathname = target.pathname;
      redirectUrl.search = target.search;
      return NextResponse.redirect(redirectUrl);
    }
    if (shouldShowPaywall(billing)) {
      return NextResponse.redirect(new URL(buildPaywallHref("/dashboard/spy"), request.url));
    }
    redirectUrl.pathname = "/dashboard/spy";
    return NextResponse.redirect(redirectUrl);
  }

  if (
    user &&
    pathname.startsWith("/dashboard") &&
    !matchesPrefix(pathname, BILLING_EXEMPT_PREFIXES)
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, company_url")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed) {
      const billing = await getBillingEntitlement(supabase, user.id);
      const targetPath = shouldShowPaywall(billing)
        ? buildPaywallHref(POST_PAYMENT_ONBOARDING_PATH)
        : billing.isUnlimited || hasActivePaidSubscription(billing)
          ? POST_PAYMENT_ONBOARDING_PATH
          : resolveIncompleteOnboardingPath(profile, billing, `${pathname}${search}`);
      const gated = NextResponse.redirect(new URL(targetPath, request.url));
      cookieJarMerge(response, gated);
      return gated;
    }

    const billing = await getBillingEntitlement(supabase, user.id);
    if (shouldShowPaywall(billing)) {
      const gated = NextResponse.redirect(new URL(buildPaywallHref(`${pathname}${search}`), request.url));
      cookieJarMerge(response, gated);
      return gated;
    }
  }

  if (isAuthPage) {
    const testerParam = request.nextUrl.searchParams.get("tester")?.trim();
    const hasValidTesterQuery = Boolean(testerParam && testerParam !== "1" && matchesTesterInviteCode(testerParam));
    const cookieCode = request.cookies.get(TESTER_INVITE_COOKIE)?.value;
    const hasValidTesterCookie = Boolean(cookieCode && matchesTesterInviteCode(cookieCode));
    if (!hasValidTesterQuery && !hasValidTesterCookie) {
      clearTesterInviteCookie(response);
    }
  }

  if (user && pathname.startsWith("/dashboard")) {
    const activityPromise = recordUserDailyActivity(supabase, user.id);
    if (event?.waitUntil) {
      event.waitUntil(activityPromise);
    } else {
      await activityPromise;
    }
  }

  return response;
}

function cookieJarMerge(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}
