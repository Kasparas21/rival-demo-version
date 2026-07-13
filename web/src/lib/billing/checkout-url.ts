import type { BillingPeriod, PolarPlanSlug } from "@/lib/billing/config";
import type { PlanTier } from "@/lib/billing/plan-limits";
import { hasActivePaidSubscription } from "@/lib/billing/entitlements";
import { shouldRedirectCheckoutToUpgrade } from "@/lib/billing/upgrade-plan";

export function safeCheckoutNextPath(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

function checkoutQuery(
  plan: PolarPlanSlug,
  period: BillingPeriod,
  next?: string | null,
): string {
  const params = new URLSearchParams({ plan });
  if (period === "annual") params.set("period", "annual");
  const safeNext = safeCheckoutNextPath(next);
  if (safeNext) params.set("next", safeNext);
  return params.toString();
}

/** Awaiting custom quote page; optional `next` preserved through checkout return. */
export function buildAwaitingQuoteHref(next?: string | null): string {
  const safeNext = safeCheckoutNextPath(next);
  if (!safeNext) return "/awaiting-quote";
  return `/awaiting-quote?next=${encodeURIComponent(safeNext)}`;
}

/** @deprecated Use buildAwaitingQuoteHref */
export function buildChoosePlanHref(next?: string | null): string {
  return buildAwaitingQuoteHref(next);
}

/** Polar hosted checkout back button — return to awaiting-quote page. */
export function buildPolarCheckoutReturnUrl(appUrl: string, next?: string | null): string {
  const base = appUrl.replace(/\/+$/, "");
  return `${base}${buildAwaitingQuoteHref(next)}`;
}

function quoteQueryParams(checkoutToken: string, next?: string | null): URLSearchParams {
  const params = new URLSearchParams({ quote: checkoutToken });
  const safeNext = safeCheckoutNextPath(next);
  if (safeNext) params.set("next", safeNext);
  return params;
}

/** Paid custom quote — Polar checkout API (never used for £0). */
export function buildQuoteApiCheckoutHref(checkoutToken: string, next?: string | null): string {
  return `/api/billing/checkout?${quoteQueryParams(checkoutToken, next).toString()}`;
}

/** Complimentary £0 quote — activates access without Polar. */
export function buildQuoteActivateHref(checkoutToken: string, next?: string | null): string {
  return `/api/billing/activate-quote?${quoteQueryParams(checkoutToken, next).toString()}`;
}

export function buildQuoteAccessHref(
  checkoutToken: string,
  complimentary: boolean,
  next?: string | null,
): string {
  return complimentary
    ? buildQuoteActivateHref(checkoutToken, next)
    : buildQuoteApiCheckoutHref(checkoutToken, next);
}

/** @deprecated Prefer buildQuoteApiCheckoutHref or buildQuoteActivateHref. */
export function buildQuoteCheckoutHref(checkoutToken: string, next?: string | null): string {
  return buildQuoteApiCheckoutHref(checkoutToken, next);
}

/** Marketing page entry: `/checkout?plan=starter` or `?plan=pro&period=annual`. */
export function buildCheckoutHref(
  plan: PolarPlanSlug,
  period: BillingPeriod = "monthly",
  next?: string | null,
): string {
  return `/checkout?${checkoutQuery(plan, period, next)}`;
}

/** Logged-in redirect target for Polar session creation. */
export function buildApiBillingCheckoutHref(
  plan: PolarPlanSlug,
  period: BillingPeriod = "monthly",
  next?: string | null,
): string {
  return `/api/billing/checkout?${checkoutQuery(plan, period, next)}`;
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

/** Agency upgrade CTA — Polar product wired when `POLAR_AGENCY_PRODUCT_ID` is set. */
export function buildUpgradeToAgencyHref(next?: string | null): string {
  return buildCheckoutHref("agency", "monthly", next);
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
  return buildCheckoutHref("pro", "monthly");
}
