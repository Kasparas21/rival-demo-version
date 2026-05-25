import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  applyTesterInviteCookieFromRequest,
  matchesTesterInviteCode,
  TESTER_INVITE_COOKIE,
} from "@/lib/billing/tester-invite";
import {
  getBillingEntitlement,
  shouldShowPostOnboardingPlanPicker,
} from "@/lib/billing/entitlements";
import { getPublicSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * /dashboard and /onboarding require auth (redirect to /login?next=…).
 * Unauthenticated /api/* must not be redirected to /login (would break JSON) — short-circuit below.
 */
const PROTECTED_PATHS = ["/dashboard", "/onboarding", "/reset-password", "/api/account"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];
const BILLING_EXEMPT_PREFIXES = ["/choose-plan", "/checkout", "/api/billing", "/auth/callback"];

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

export async function updateSession(request: NextRequest) {
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
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = "";
    if (!profile?.onboarding_completed) {
      redirectUrl.pathname = "/onboarding";
      return NextResponse.redirect(redirectUrl);
    }
    const billing = await getBillingEntitlement(supabase, user.id);
    if (shouldShowPostOnboardingPlanPicker(billing)) {
      redirectUrl.pathname = "/choose-plan";
      redirectUrl.searchParams.set("next", "/dashboard/spy");
      return NextResponse.redirect(redirectUrl);
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
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      const billing = await getBillingEntitlement(supabase, user.id);
      if (shouldShowPostOnboardingPlanPicker(billing)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/choose-plan";
        redirectUrl.searchParams.set("next", `${pathname}${search}`);
        const gated = NextResponse.redirect(redirectUrl);
        cookieJarMerge(response, gated);
        return gated;
      }
    }
  }

  if (isAuthPage) {
    const testerParam = request.nextUrl.searchParams.get("tester")?.trim();
    const hasValidTesterQuery = Boolean(testerParam && testerParam !== "1" && matchesTesterInviteCode(testerParam));
    if (!hasValidTesterQuery && request.cookies.get(TESTER_INVITE_COOKIE)?.value) {
      clearTesterInviteCookie(response);
    }
  }

  return response;
}

function cookieJarMerge(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}
