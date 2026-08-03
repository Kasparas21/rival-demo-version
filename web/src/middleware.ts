import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { POSTHOG_DISTINCT_ID_HEADER } from "@/lib/analytics/posthog-config";
import {
  POSTHOG_DISTINCT_ID_COOKIE,
  readPostHogDistinctIdCookie,
} from "@/lib/analytics/posthog-distinct-id";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import {
  applyTesterInviteCookieFromRequest,
  matchesTesterInviteCode,
} from "@/lib/billing/tester-invite";
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_USER_PICKED_COOKIE,
} from "@/lib/i18n/locale";
import { updateSession } from "@/lib/supabase/middleware";

/** Always assign a stable ID — Edge middleware cannot read server-only PostHog env vars. */
function resolvePostHogDistinctId(request: NextRequest): string {
  return (
    readPostHogDistinctIdCookie(request.cookies.get(POSTHOG_DISTINCT_ID_COOKIE)?.value) ??
    crypto.randomUUID()
  );
}

function attachPostHogDistinctId(
  request: NextRequest,
  response: NextResponse,
  requestHeaders: Headers,
) {
  const distinctId = resolvePostHogDistinctId(request);
  requestHeaders.set(POSTHOG_DISTINCT_ID_HEADER, distinctId);

  const hasCookie = readPostHogDistinctIdCookie(
    request.cookies.get(POSTHOG_DISTINCT_ID_COOKIE)?.value,
  );
  if (hasCookie) return;

  response.cookies.set(POSTHOG_DISTINCT_ID_COOKIE, distinctId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function applyPostHogDistinctIdCookie(request: NextRequest, response: NextResponse) {
  const distinctId = resolvePostHogDistinctId(request);

  const hasCookie = readPostHogDistinctIdCookie(
    request.cookies.get(POSTHOG_DISTINCT_ID_COOKIE)?.value,
  );
  if (!hasCookie) {
    response.cookies.set(POSTHOG_DISTINCT_ID_COOKIE, distinctId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

function handleHomeLocale(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const langParam = request.nextUrl.searchParams.get("lang");
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const userPickedLocale = request.cookies.get(LOCALE_USER_PICKED_COOKIE)?.value === "1";
  const country = request.headers.get("x-vercel-ip-country");

  const locale =
    pathname === "/"
      ? "en"
      : resolveLocale({
          langParam,
          cookie: cookieLocale,
          userPickedLocale,
          country,
        });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (pathname !== "/" && isLocale(langParam)) {
    response.cookies.set(LOCALE_COOKIE, langParam, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    response.cookies.set(LOCALE_USER_PICKED_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  attachPostHogDistinctId(request, response, requestHeaders);

  response.headers.set("Vary", "Cookie, x-vercel-ip-country");

  const testerParam = request.nextUrl.searchParams.get("tester")?.trim();
  if (testerParam && testerParam !== "1" && matchesTesterInviteCode(testerParam)) {
    return applyTesterInviteCookieFromRequest(request, response);
  }

  return response;
}

const LOCALE_PATHS = new Set([
  "/",
  "/about",
  "/features",
  "/privacy",
  "/terms",
  "/cookies",
  "/compare",
  "/pricing",
  "/onboarding",
  "/choose-plan",
  "/awaiting-quote",
  "/signup",
]);

function isLocalePath(pathname: string) {
  if (LOCALE_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/invite/")) return true;
  return pathname.startsWith("/blog");
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (isLocalePath(pathname)) {
    return handleHomeLocale(request);
  }

  return applyPostHogDistinctIdCookie(request, await updateSession(request, event));
}

export const config = {
  matcher: [
    "/",
    "/about",
    "/features",
    "/blog/:path*",
    "/privacy",
    "/terms",
    "/cookies",
    "/compare",
    "/pricing",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/auth/:path*",
    "/onboarding",
    "/choose-plan",
    "/awaiting-quote",
    "/admin",
    "/admin/:path*",
    "/invite/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/api/account/:path*",
  ],
};
