import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureUserProfile } from "@/lib/auth/profile";
import { claimTesterAccessForUser } from "@/lib/billing/claim-tester-access-core";
import {
  CHOOSE_PLAN_AFTER_TRIAL_PATH,
  resolveAuthCallbackNext,
  shouldRedirectToTrialComplete,
} from "@/lib/auth/trial-flow";
import { TRIAL_PENDING_COOKIE } from "@/lib/auth/oauth-bridge-cookies";
import { adminSkipCheckoutDestination, getBillingEntitlement } from "@/lib/billing/entitlements";
import { POST_PAYMENT_ONBOARDING_PATH, resolveIncompleteOnboardingPath } from "@/lib/onboarding/phase";
import { persistTesterInviteToUserMetadata, readTesterInviteFromUserMetadata } from "@/lib/billing/tester-invite-user";
import {
  matchesTesterInviteCode,
  normalizeInviteCode,
  OAUTH_TESTER_INVITE_COOKIE,
  setTesterInviteCookie,
  TESTER_INVITE_COOKIE,
} from "@/lib/billing/tester-invite";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return decoded.startsWith("/") && !decoded.startsWith("//") && decoded !== "/login" ? decoded : null;
}

function postOnboardingPath(path: string): string {
  return path === "/checkout" ? "/api/billing/checkout" : path;
}

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
    .select("onboarding_completed, company_url")
    .eq("id", user.id)
    .maybeSingle();

  const onboardingDone = profile?.onboarding_completed === true;
  const safeRequested = resolveAuthCallbackNext(url.searchParams.get("next"), request.cookies);
  const safePostOnboardingPath = safeRequested ? postOnboardingPath(safeRequested) : null;

  const inviteFromMetadata = readTesterInviteFromUserMetadata(user.user_metadata);
  const oauthBridgeRaw = request.cookies.get(OAUTH_TESTER_INVITE_COOKIE)?.value;
  const inviteFromOAuthBridge =
    oauthBridgeRaw && matchesTesterInviteCode(oauthBridgeRaw)
      ? normalizeInviteCode(oauthBridgeRaw)
      : null;
  const testerFromQuery = url.searchParams.get("tester");
  const inviteFromQuery =
    testerFromQuery && matchesTesterInviteCode(testerFromQuery)
      ? normalizeInviteCode(testerFromQuery)
      : null;
  const cookieTesterRaw = request.cookies.get(TESTER_INVITE_COOKIE)?.value;
  const inviteFromCookie =
    cookieTesterRaw && matchesTesterInviteCode(cookieTesterRaw)
      ? normalizeInviteCode(cookieTesterRaw)
      : null;
  const inviteCode =
    inviteFromMetadata ?? inviteFromOAuthBridge ?? inviteFromQuery ?? inviteFromCookie;

  const trialFunnel = shouldRedirectToTrialComplete(
    safeRequested,
    request.cookies.get(TRIAL_PENDING_COOKIE)?.value,
  );

  let claimedTesterAccess = false;
  if (inviteCode && trialFunnel && !onboardingDone) {
    try {
      const admin = createSupabaseAdminClient();
      await persistTesterInviteToUserMetadata(admin, user.id, inviteCode);
      const claim = await claimTesterAccessForUser(admin, user.id, inviteCode);
      claimedTesterAccess = claim.ok;
      if (!claim.ok) {
        console.error("[auth/callback] auto-claim tester access", claim.error);
      }
    } catch (err) {
      console.error("[auth/callback] auto-claim tester access", err);
    }
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  const resolvedNext = safePostOnboardingPath
    ? adminSkipCheckoutDestination(safePostOnboardingPath, billing.isUnlimited)
    : null;

  const RESET_PASSWORD_PATH = "/reset-password";

  let pathname: string;
  let searchFromIncomplete: string | null = null;
  if (safePostOnboardingPath === RESET_PASSWORD_PATH) {
    pathname = RESET_PASSWORD_PATH;
  } else if (!onboardingDone && trialFunnel) {
    if (claimedTesterAccess || billing.isUnlimited) {
      const postPayment = new URL(POST_PAYMENT_ONBOARDING_PATH, url.origin);
      pathname = postPayment.pathname;
      searchFromIncomplete = postPayment.search;
    } else {
      const trialPlans = new URL(CHOOSE_PLAN_AFTER_TRIAL_PATH, url.origin);
      pathname = trialPlans.pathname;
      searchFromIncomplete = trialPlans.search;
    }
  } else if (!onboardingDone) {
    const incompleteTarget = resolveIncompleteOnboardingPath(
      profile,
      billing,
      resolvedNext ?? "/dashboard/spy",
    );
    const parsedIncomplete = new URL(incompleteTarget, url.origin);
    pathname = parsedIncomplete.pathname;
    searchFromIncomplete = parsedIncomplete.search;
  } else if (resolvedNext) {
    pathname = resolvedNext;
  } else {
    pathname = "/dashboard/spy";
  }

  const finalDest = request.nextUrl.clone();
  finalDest.pathname = pathname;
  finalDest.search = searchFromIncomplete ?? "";
  finalDest.hash = "";
  if (
    !onboardingDone &&
    !searchFromIncomplete &&
    pathname === "/onboarding" &&
    resolvedNext
  ) {
    finalDest.searchParams.set("next", resolvedNext);
  }

  const out = NextResponse.redirect(finalDest);
  cookieJar.forEach(({ value, options }, name) => {
    out.cookies.set(name, value, options);
  });
  out.cookies.set("rival_oauth_next", "", { maxAge: 0, path: "/" });
  out.cookies.set(OAUTH_TESTER_INVITE_COOKIE, "", { maxAge: 0, path: "/" });

  if (inviteCode) {
    setTesterInviteCookie(out, inviteCode);
    if (!claimedTesterAccess) {
      try {
        const admin = createSupabaseAdminClient();
        await persistTesterInviteToUserMetadata(admin, user.id, inviteCode);
      } catch (err) {
        console.error("[auth/callback] persist tester invite metadata", err);
      }
    }
  }

  return out;
}
