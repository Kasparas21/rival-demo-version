import type { BillingPeriod, PolarPlanSlug } from "@/lib/billing/config";

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

/** Tester cohort: Pro checkout with pre-applied Polar discount. */
export function buildTesterCheckoutHref(): string {
  return "/api/billing/checkout?plan=pro&tester=1";
}

export function parseCheckoutPeriod(raw: string | null | undefined): BillingPeriod {
  return raw?.trim().toLowerCase() === "annual" ? "annual" : "monthly";
}
