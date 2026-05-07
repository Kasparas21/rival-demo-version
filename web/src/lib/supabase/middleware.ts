import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * /dashboard and /onboarding require auth (redirect to /login?next=…).
 * Unauthenticated /api/* must not be redirected to /login (would break JSON) — short-circuit below.
 */
const PROTECTED_PATHS = ["/dashboard", "/onboarding", "/api/account"];
const AUTH_PAGES = ["/login"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
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
    redirectUrl.pathname = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
