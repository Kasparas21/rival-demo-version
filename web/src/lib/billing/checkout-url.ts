import type { BillingPeriod, PolarPlanSlug } from "@/lib/billing/config";
import type { PlanTier } from "@/lib/billing/plan-limits";
import { hasActivePaidSubscription } from "@/lib/billing/entitlements";
import { shouldRedirectCheckoutToUpgrade } from "@/lib/billing/upgrade-plan";

function checkoutQuery(plan: PolarPlanSlug, period: BillingPeriod): string {
  const params = new URLSearchParams({ plan });
  if (period === "annual") params.set("period", "annual");
  return params.toString();
}

/** Marketing page entry: `/checkout?plan=starter` or `?plan=pro&period=annual`. */
export function buildCheckoutHref(plan: PolarPlanSlug, period: BillingPeriod = "monthly"): string {
  return `/checkout?${checkoutQuery(plan, period)}`;
}

/** Logged-in redirect target for Polar session creation. */
export function buildApiBillingCheckoutHref(
  plan: PolarPlanSlug,
  period: BillingPeriod = "monthly",
): string {
  return `/api/billing/checkout?${checkoutQuery(plan, period)}`;
}

export const POLAR_BILLING_PORTAL_HREF = "/api/billing/portal";
export const POLAR_BILLING_UPGRADE_HREF = "/api/billing/upgrade";

/** Tester cohort: Pro checkout with pre-applied Polar discount. */
export function buildTesterCheckoutHref(options?: { intent?: "json" }): string {
  const params = new URLSearchParams({ plan: "pro", tester: "1" });
  if (options?.intent === "json") params.set("intent", "json");
  return `/api/billing/checkout?${params.toString()}`;
}

export function parseCheckoutPeriod(raw: string | null | undefined): BillingPeriod {
  return raw?.trim().toLowerCase() === "annual" ? "annual" : "monthly";
}

/** Pro upgrade CTA: prorated Polar upgrade for active Starter, checkout for everyone else. */
export function buildUpgradeToProHref(options: {
  planTier: PlanTier;
  status: string;
  isUnlimited?: boolean;
}): string {
  const billing = {
    planTier: options.planTier,
    status: options.status,
    isUnlimited: options.isUnlimited ?? false,
  };
  const hasActivePaid = hasActivePaidSubscription(billing);
  if (
    options.planTier === "starter" &&
    shouldRedirectCheckoutToUpgrade({
      requestedPlan: "pro",
      planTier: "starter",
      hasActivePaid,
    })
  ) {
    return POLAR_BILLING_UPGRADE_HREF;
  }
  return buildCheckoutHref("pro");
}
