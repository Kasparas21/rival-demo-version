import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureUserProfile } from "@/lib/auth/profile";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

const OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
  "recovery",
  "invite",
  "email_change",
]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");

  const { supabaseUrl, supabasePublishableKey } = getPublicSupabaseEnv();

  const fail = (message: string) => {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("error", message);
    return NextResponse.redirect(login);
  };

  if (oauthError) {
    const msg =
      oauthError === "access_denied"
        ? "Google sign-in was cancelled."
        : [oauthErrorDescription, oauthError].filter(Boolean).join(" — ") || oauthError;
    return fail(msg);
  }

  const cookieJar = new Map<string, { value: string; options: CookieOptions }>();

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieJar.set(name, { value, options });
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return fail(error.message);
    }
  } else if (token_hash && typeParam && OTP_TYPES.has(typeParam as EmailOtpType)) {
    // GoTrue expects `type: "email"` for magic-link `token_hash` verification (see @supabase/auth-js verifyOtp docs).
    // Query strings from links often use type=magiclink; wrong type can yield no session — verifyOtp then throws non-AuthError → 500.
    const verifyType: EmailOtpType =
      typeParam === "magiclink" ? "email" : (typeParam as EmailOtpType);
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: verifyType,
      });
      if (error) {
        return fail(error.message);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "verify_failed";
      return fail(message);
    }
  } else {
    return fail("missing_code");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail("no_user");
  }

  try {
    await ensureUserProfile(supabase, user);
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "profile_setup_failed";
    return fail(message);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const onboardingDone = profile?.onboarding_completed === true;
  const requestedNext = url.searchParams.get("next");
  const safeRequested =
    requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    requestedNext !== "/login"
      ? requestedNext
      : null;

  let pathname: string;
  if (!onboardingDone) {
    pathname = "/onboarding";
  } else if (safeRequested) {
    pathname = safeRequested;
  } else {
    pathname = "/dashboard";
  }

  const finalDest = request.nextUrl.clone();
  finalDest.pathname = pathname;
  finalDest.search = "";
  finalDest.hash = "";

  const out = NextResponse.redirect(finalDest);
  cookieJar.forEach(({ value, options }, name) => {
    out.cookies.set(name, value, options);
  });
  return out;
}
