import { POST_PAYMENT_ONBOARDING_PATH } from "@/lib/onboarding/phase";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/oauth-bridge-cookies";

function safeRelativePath(value: string | null | undefined): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return decoded.startsWith("/") && !decoded.startsWith("//") && decoded !== "/login" ? decoded : null;
}

/** After signup: silently apply guest draft, then await custom quote. */
export const TRIAL_COMPLETE_PATH = "/trial/complete";

export const AWAITING_QUOTE_AFTER_TRIAL_PATH = `/awaiting-quote?next=${encodeURIComponent(POST_PAYMENT_ONBOARDING_PATH)}`;

/** @deprecated Use AWAITING_QUOTE_AFTER_TRIAL_PATH */
export const CHOOSE_PLAN_AFTER_TRIAL_PATH = AWAITING_QUOTE_AFTER_TRIAL_PATH;

export const SIGNUP_AFTER_ONBOARDING_PATH = `/signup?next=${encodeURIComponent(AWAITING_QUOTE_AFTER_TRIAL_PATH)}`;

/** Signup URL after guest pre-payment onboarding, preserving tester invite attribution. */
export function buildSignupAfterOnboardingPath(testerCode?: string | null): string {
  if (!testerCode?.trim()) return SIGNUP_AFTER_ONBOARDING_PATH;
  const base = new URL(SIGNUP_AFTER_ONBOARDING_PATH, "http://local");
  base.searchParams.set("tester", testerCode.trim().toLowerCase());
  return `${base.pathname}${base.search}`;
}

/** Landing free-trial CTAs start here (guest or authenticated). */
export function getTrialStartHref(domain?: string | null): string {
  if (!domain?.trim()) return "/onboarding";
  return `/onboarding?domain=${encodeURIComponent(domain.trim())}`;
}

/** @deprecated Use TRIAL_COMPLETE_PATH */
export const ONBOARDING_RESUME_PATH = "/onboarding?resume=1";

export function isTrialCompletePath(path: string): boolean {
  return path === TRIAL_COMPLETE_PATH || path.startsWith("/trial/complete");
}

export function isOnboardingResumePath(path: string): boolean {
  return path === ONBOARDING_RESUME_PATH || (path.startsWith("/onboarding") && path.includes("resume=1"));
}

export function isPostGuestSignupPath(path: string): boolean {
  if (isTrialCompletePath(path) || isOnboardingResumePath(path)) return true;
  if (path === AWAITING_QUOTE_AFTER_TRIAL_PATH || path.startsWith("/awaiting-quote?")) return true;
  if (path === CHOOSE_PLAN_AFTER_TRIAL_PATH || path.startsWith("/choose-plan?")) return true;
  return false;
}

/** OAuth/email signup should land on trial complete (apply draft → awaiting quote), not onboarding again. */
export function shouldRedirectToTrialComplete(
  requestedNext: string | null | undefined,
  trialPendingCookie: string | undefined,
): boolean {
  if (requestedNext && isPostGuestSignupPath(requestedNext)) return true;
  return trialPendingCookie === "1";
}

/** `next` from callback query or OAuth bridge cookie (Supabase often drops query params). */
export function resolveAuthCallbackNext(
  queryNext: string | null,
  cookies: { get: (name: string) => { value: string } | undefined },
): string | null {
  return safeRelativePath(queryNext) ?? safeRelativePath(cookies.get(OAUTH_NEXT_COOKIE)?.value ?? null);
}
