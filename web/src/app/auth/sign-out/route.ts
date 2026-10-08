import { NextResponse, type NextRequest } from "next/server";

import { OAUTH_NEXT_COOKIE, TRIAL_PENDING_COOKIE } from "@/lib/auth/oauth-bridge-cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";

function clearAuthBridgeCookies(response: NextResponse): void {
  const opts = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  response.cookies.set(TRIAL_PENDING_COOKIE, "", opts);
  response.cookies.set(OAUTH_NEXT_COOKIE, "", opts);
}

async function signOutSession(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

/** Visiting the URL no longer signs anyone out (a link or image on another site could). */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

/**
 * Form submissions (the sign-out buttons) get a redirect to `next`; fetch callers get JSON. A form posted
 * from another site doesn't carry the SameSite=Lax session cookie, so it can't sign anyone out.
 */
export async function POST(request: NextRequest) {
  await signOutSession();
  const isForm = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  if (isForm) {
    const form = await request.formData().catch(() => null);
    const next = safeNextPath(typeof form?.get("next") === "string" ? (form.get("next") as string) : null);
    const dest = next && next !== "/auth/sign-out" ? next : "/login";
    const response = NextResponse.redirect(new URL(dest, request.url), 303);
    clearAuthBridgeCookies(response);
    return response;
  }
  const response = NextResponse.json({ ok: true });
  clearAuthBridgeCookies(response);
  return response;
}
