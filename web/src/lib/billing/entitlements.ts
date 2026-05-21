import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isDebugPlatformClassificationEnabled } from "@/lib/debug/platform-classification";
import { getPolarProductIds } from "@/lib/billing/config";
import {
  limitsForTier,
  normalizePlanTier,
  PLAN_DISPLAY_NAMES,
  type DevPlanOverride,
  type PlanLimits,
  type PlanTier,
} from "@/lib/billing/plan-limits";

export type { PlanLimits, PlanTier, DevPlanOverride };

export const BILLING_PLAN_NAME = "Rival";

export type BillingEntitlement = {
  hasAccess: boolean;
  status: string;
  planTier: PlanTier;
  planName: string;
  polarProductId: string | null;
  polarCustomerId: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  isUnlimited: boolean;
  canUseDevPlanSwitcher: boolean;
  devPlanOverride: DevPlanOverride | null;
};

export function isSubscriptionStatusAllowed(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

function readRawPayload(rawPayload: unknown): Record<string, unknown> {
  if (typeof rawPayload === "object" && rawPayload !== null && !Array.isArray(rawPayload)) {
    return rawPayload as Record<string, unknown>;
  }
  return {};
}

function isManualAdminUnlimited(rawPayload: unknown): boolean {
  const p = readRawPayload(rawPayload);
  return p.admin_unlimited === true;
}

function readDevPlanOverride(rawPayload: unknown): DevPlanOverride | null {
  const v = readRawPayload(rawPayload).dev_plan_override;
  if (typeof v !== "string") return null;
  return normalizePlanTier(v);
}

export function isDevPlanOverrideEnabled(): boolean {
  return process.env.ALLOW_DEV_PLAN_OVERRIDE?.trim() === "true";
}

function tierFromPolarProductId(productId: string | null | undefined): PlanTier | null {
  if (!productId?.trim()) return null;
  const ids = getPolarProductIds();
  if (
    (ids.starter && productId === ids.starter) ||
    (ids.starterAnnual && productId === ids.starterAnnual)
  ) {
    return "starter";
  }
  if (
    (ids.pro && productId === ids.pro) ||
    (ids.proAnnual && productId === ids.proAnnual) ||
    (ids.legacy && productId === ids.legacy)
  ) {
    return "pro";
  }
  return null;
}

export function resolvePlanTier(params: {
  status: string;
  polarProductId: string | null;
  rawPayload: unknown;
  applyDevOverride: boolean;
}): PlanTier {
  const { status, polarProductId, rawPayload, applyDevOverride } = params;

  if (isManualAdminUnlimited(rawPayload)) {
    const override = readDevPlanOverride(rawPayload);
    if (applyDevOverride && override) {
      return override;
    }
    return "admin";
  }

  const override = readDevPlanOverride(rawPayload);
  if (applyDevOverride && override) {
    return override;
  }

  if (status === "active" || status === "trialing") {
    const fromProduct = tierFromPolarProductId(polarProductId);
    if (fromProduct) return fromProduct;
    if (status === "trialing") {
      return "free_trial";
    }
    return "starter";
  }

  return "free_trial";
}

export function hasAccessForTier(tier: PlanTier, status: string, isUnlimited: boolean): boolean {
  if (isUnlimited && tier === "admin") return true;
  if (tier === "free_trial") return true;
  if (tier === "starter" || tier === "pro") {
    return status === "active" || status === "trialing";
  }
  return false;
}

/** Active Polar Starter/Pro subscription (not workspace free-trial tier). */
export function hasActivePaidSubscription(
  billing: Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited">,
): boolean {
  if (billing.isUnlimited) return true;
  return (
    (billing.planTier === "starter" || billing.planTier === "pro") &&
    isSubscriptionStatusAllowed(billing.status)
  );
}

/**
 * Post-onboarding plan picker (step 6 / choose-plan).
 * Free-trial tier still has `hasAccess` for product features, but must pick Starter or Pro to subscribe.
 */
export function shouldShowPostOnboardingPlanPicker(
  billing: Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited">,
): boolean {
  if (billing.isUnlimited) return false;
  return !hasActivePaidSubscription(billing);
}

export async function getBillingEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<BillingEntitlement> {
  const { data } = await supabase
    .from("billing_subscriptions")
    .select(
      "status, polar_product_id, polar_product_name, polar_customer_id, trial_end, current_period_end, cancel_at_period_end, raw_payload",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const status = data?.status ?? "none";
  const rawPayload = data?.raw_payload;
  const isUnlimited = isManualAdminUnlimited(rawPayload);
  const devPlanOverride = readDevPlanOverride(rawPayload);
  const applyDevOverride = isUnlimited || isDevPlanOverrideEnabled();
  const canUseDevPlanSwitcher =
    isDebugPlatformClassificationEnabled() && (isUnlimited || isDevPlanOverrideEnabled());

  const planTier = resolvePlanTier({
    status,
    polarProductId: data?.polar_product_id ?? null,
    rawPayload,
    applyDevOverride,
  });

  const limits = limitsForTier(planTier);
  const hasAccess = hasAccessForTier(planTier, status, isUnlimited);

  let planName = PLAN_DISPLAY_NAMES[planTier];
  if (isUnlimited && planTier === "admin") {
    planName = data?.polar_product_name?.trim() || "Complimentary (admin)";
  }

  return {
    hasAccess,
    status,
    planTier,
    planName,
    polarProductId: data?.polar_product_id ?? null,
    polarCustomerId: data?.polar_customer_id ?? null,
    trialEnd: data?.trial_end ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    limits,
    isUnlimited: isUnlimited && planTier === "admin",
    canUseDevPlanSwitcher,
    devPlanOverride,
  };
}

function isCheckoutOrBillingPath(path: string): boolean {
  return path === "/checkout" || path === "/api/billing/checkout";
}

export function adminSkipCheckoutDestination(path: string, isUnlimited: boolean): string {
  return isUnlimited && isCheckoutOrBillingPath(path) ? "/dashboard/spy" : path;
}

export function remainingMonthlyAdsProcessed(
  currentAds: number,
  requestedAds = 0,
  limit: number,
): number {
  return Math.max(0, limit - currentAds - Math.max(0, requestedAds));
}

export function billingRequiredResponseBody(
  message = "Upgrade to Starter or Pro to continue.",
  checkoutPlan?: "starter" | "pro",
) {
  const checkoutUrl = checkoutPlan ? `/checkout?plan=${checkoutPlan}` : "/checkout";
  return {
    ok: false,
    code: "subscription_required",
    error: message,
    checkoutUrl,
  };
}

export function quotaExceededResponseBody(params: {
  used: number;
  requested: number;
  limit: number;
  metric?: string;
}) {
  const { used, requested, limit, metric = "ads processed" } = params;
  return {
    ok: false,
    code: "quota_exceeded",
    error: `Monthly ${metric} limit reached (${used}/${limit}).`,
    limit,
    used,
    requested,
    remaining: remainingMonthlyAdsProcessed(used, requested, limit),
    checkoutUrl: "/checkout?plan=pro",
  };
}

export function freeTrialScrapeUsedResponseBody() {
  return {
    ok: false,
    code: "free_trial_scrape_used",
    error:
      "Your free trial includes one competitor discovery scrape. Upgrade to Starter or Pro for ongoing refreshes.",
    checkoutUrl: "/checkout?plan=starter",
  };
}

export function featureNotAvailableResponseBody(feature: string, requiredTier: PlanTier = "pro") {
  return {
    ok: false,
    code: "feature_not_available",
    error: `${feature} is available on the ${PLAN_DISPLAY_NAMES[requiredTier]} plan.`,
    requiredTier,
    checkoutUrl: `/checkout?plan=${requiredTier === "starter" ? "starter" : "pro"}`,
  };
}
