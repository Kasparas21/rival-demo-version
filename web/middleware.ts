import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  isPostHogServerConfigured,
  POSTHOG_DISTINCT_ID_HEADER,
} from "@/lib/analytics/posthog-config";
import {
  POSTHOG_DISTINCT_ID_COOKIE,
  readPostHogDistinctIdCookie,
} from "@/lib/analytics/posthog-distinct-id";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { isLocale, LOCALE_COOKIE, LOCALE_HEADER } from "@/lib/i18n/locale";
import { updateSession } from "@/lib/supabase/middleware";

function resolvePostHogDistinctId(request: NextRequest): string | null {
  if (!isPostHogServerConfigured()) return null;

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
  if (!distinctId) return;

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

function handleHomeLocale(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get("lang");
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const country = request.headers.get("x-vercel-ip-country");

  const locale = resolveLocale({ langParam, cookie: cookieLocale, country });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (isLocale(langParam)) {
    response.cookies.set(LOCALE_COOKIE, langParam, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  attachPostHogDistinctId(request, response, requestHeaders);

  response.headers.set("Vary", "Cookie, x-vercel-ip-country");

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
  "/signup",
]);

function isLocalePath(pathname: string) {
  if (LOCALE_PATHS.has(pathname)) return true;
  return pathname.startsWith("/blog");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isLocalePath(pathname)) {
    return handleHomeLocale(request);
  }

  return updateSession(request);
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
    "/dashboard",
    "/dashboard/:path*",
    "/api/account/:path*",
  ],
};
