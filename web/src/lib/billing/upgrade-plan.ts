import type { BillingPeriod, PolarPlanSlug } from "@/lib/billing/config";
import { getPolarProductIds, polarProductIdForPlan } from "@/lib/billing/config";
import type { PlanTier } from "@/lib/billing/plan-limits";

/** Map a Polar product id to monthly vs annual billing period. */
export function billingPeriodForProductId(productId: string | null | undefined): BillingPeriod {
  if (!productId?.trim()) return "monthly";
  const ids = getPolarProductIds();
  if (ids.starterAnnual && productId === ids.starterAnnual) return "annual";
  if (ids.proAnnual && productId === ids.proAnnual) return "annual";
  return "monthly";
}

export function isStarterProductId(productId: string | null | undefined): boolean {
  if (!productId?.trim()) return false;
  const ids = getPolarProductIds();
  return productId === ids.starter || productId === ids.starterAnnual;
}

/** Resolve target Polar product id when upgrading/downgrading, preserving billing period. */
export function resolveUpgradeProductId(
  currentProductId: string | null | undefined,
  targetPlan: PolarPlanSlug,
): string {
  const period = billingPeriodForProductId(currentProductId);
  return polarProductIdForPlan(targetPlan, period);
}

/** Whether checkout should redirect to prorated upgrade instead of new checkout. */
export function shouldRedirectCheckoutToUpgrade(params: {
  requestedPlan: PolarPlanSlug;
  planTier: PlanTier;
  hasActivePaid: boolean;
}): boolean {
  return (
    params.hasActivePaid &&
    params.planTier === "starter" &&
    params.requestedPlan === "pro"
  );
}
