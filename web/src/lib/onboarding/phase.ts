import { hasActivePaidSubscription, shouldShowAwaitingQuotePage } from "@/lib/billing/entitlements";
import type { BillingEntitlement } from "@/lib/billing/entitlements";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";

export type OnboardingProfileSlice = {
  onboarding_completed?: boolean | null;
  company_url?: string | null;
};

/** Company + platforms saved before paywall; onboarding not finished. */
export function hasPrePaymentSetup(profile: OnboardingProfileSlice | null | undefined): boolean {
  return Boolean(profile?.company_url?.trim()) && profile?.onboarding_completed !== true;
}

export const POST_PAYMENT_ONBOARDING_PATH = "/onboarding?phase=post_payment";

export function isPostPaymentOnboardingSearchParams(params: {
  phase?: string | string[] | undefined;
}): boolean {
  const raw = params.phase;
  const phase = Array.isArray(raw) ? raw[0] : raw;
  return phase === "post_payment";
}

/** Agency (or admin) user adding another own-brand workspace via full onboarding. */
export function isNewBrandOnboardingSearchParams(params: {
  mode?: string | string[] | undefined;
}): boolean {
  const raw = params.mode;
  const mode = Array.isArray(raw) ? raw[0] : raw;
  return mode === "new_brand";
}

export const NEW_BRAND_ONBOARDING_PATH = "/onboarding?mode=new_brand";

export type OnboardingBillingSlice = Pick<
  BillingEntitlement,
  "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord"
>;

/** Authenticated user should finish regions + ad profiles after subscribing. */
export function shouldResumePostPaymentOnboarding(
  profile: OnboardingProfileSlice | null | undefined,
  billing: Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited">,
): boolean {
  if (!hasPrePaymentSetup(profile)) return false;
  if (billing.isUnlimited) return true;
  return hasActivePaidSubscription(billing);
}

function canFinishPostPaymentOnboarding(
  billing: Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited">,
): boolean {
  return billing.isUnlimited || hasActivePaidSubscription(billing);
}

/**
 * Where to send a signed-in user who has not finished onboarding.
 * @param safeNext — validated post-onboarding destination (dashboard path, etc.)
 */
export function resolveIncompleteOnboardingPath(
  profile: OnboardingProfileSlice | null | undefined,
  billing: OnboardingBillingSlice,
  safeNext?: string | null,
): string {
  const dest = safeNext?.trim() || DASHBOARD_HOME_PATH;

  if (hasPrePaymentSetup(profile)) {
    if (shouldShowAwaitingQuotePage(billing)) {
      return `/awaiting-quote?next=${encodeURIComponent(POST_PAYMENT_ONBOARDING_PATH)}`;
    }
    if (canFinishPostPaymentOnboarding(billing)) {
      return POST_PAYMENT_ONBOARDING_PATH;
    }
    return `/awaiting-quote?next=${encodeURIComponent(POST_PAYMENT_ONBOARDING_PATH)}`;
  }

  return dest !== DASHBOARD_HOME_PATH ? `/onboarding?next=${encodeURIComponent(dest)}` : "/onboarding";
}
