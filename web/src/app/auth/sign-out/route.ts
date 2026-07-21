import { NextResponse, type NextRequest } from "next/server";

import { OAUTH_NEXT_COOKIE, OAUTH_TEAM_INVITE_TOKEN_COOKIE, TRIAL_PENDING_COOKIE } from "@/lib/auth/oauth-bridge-cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function clearAuthBridgeCookies(response: NextResponse): void {
  const opts = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  response.cookies.set(TRIAL_PENDING_COOKIE, "", opts);
  response.cookies.set(OAUTH_NEXT_COOKIE, "", opts);
  response.cookies.set(OAUTH_TEAM_INVITE_TOKEN_COOKIE, "", opts);
}

async function signOutSession(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function GET(request: NextRequest) {
  await signOutSession();
  const next = request.nextUrl.searchParams.get("next")?.trim() ?? "";
  const dest =
    next.startsWith("/") && !next.startsWith("//") && next !== "/auth/sign-out" ? next : "/login";
  const response = NextResponse.redirect(new URL(dest, request.url));
  clearAuthBridgeCookies(response);
  return response;
}

export async function POST() {
  await signOutSession();
  const response = NextResponse.json({ ok: true });
  clearAuthBridgeCookies(response);
  return response;
}
