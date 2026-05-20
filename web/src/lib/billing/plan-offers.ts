import type { BillingPeriod } from "@/lib/billing/config";

export type PlanOfferSlug = "starter" | "pro";

export type PlanOffer = {
  slug: PlanOfferSlug;
  name: string;
  summary: string;
  monthlyUsd: number;
  annualMonthlyUsd: number;
  annualYearlyUsd: number;
  features: string[];
  plusLabel?: string;
  popular?: boolean;
};

export const PLAN_TRIAL_BADGE = "7-day free trial";

export const PLAN_PICKER_INTRO =
  "Both plans include a 7-day free trial — full product, card required, cancel anytime.";

export const PLAN_OFFERS: PlanOffer[] = [
  {
    slug: "starter",
    name: "Starter",
    summary: "For solo media buyers tracking up to 5 rivals.",
    monthlyUsd: 79,
    annualMonthlyUsd: 59,
    annualYearlyUsd: 708,
    features: [
      "5 competitors · 15 swaps/mo",
      "All 6 platforms · auto-refresh",
      "Strategy Map, Three Moves, Copy Vault, Timeline",
      "Weekly Monday digest",
      "1 seat",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    summary: "For agencies and multi-client teams.",
    monthlyUsd: 149,
    annualMonthlyUsd: 129,
    annualYearlyUsd: 1548,
    plusLabel: "Everything in Starter, plus",
    popular: true,
    features: [
      "15 competitors · 50 swaps/mo",
      "Priority refresh · CSV export",
      "2 seats · manual refresh on demand",
      "Emerging Angle Alerts",
    ],
  },
];

export function annualSavingsPercent(offer: PlanOffer): number {
  const annualFull = offer.monthlyUsd * 12;
  return Math.round((1 - offer.annualYearlyUsd / annualFull) * 100);
}

/** Highest annual savings % across plans (for billing toggle badge). */
export function maxAnnualSavingsPercent(): number {
  return Math.max(...PLAN_OFFERS.map(annualSavingsPercent));
}

export function planPriceDisplay(
  offer: PlanOffer,
  billing: BillingPeriod,
): {
  primary: string;
  secondary: string;
  listMonthlyUsd?: number;
  savingsPercent?: number;
  annualYearlyUsd?: number;
} {
  const { monthlyUsd, annualMonthlyUsd, annualYearlyUsd } = offer;

  if (billing === "monthly") {
    return {
      primary: `$${monthlyUsd}`,
      secondary: `then $${monthlyUsd}/mo · ${PLAN_TRIAL_BADGE}`,
    };
  }

  const pct = annualSavingsPercent(offer);
  return {
    primary: `$${annualMonthlyUsd}`,
    secondary: `$${annualYearlyUsd}/yr billed annually · ${PLAN_TRIAL_BADGE}`,
    listMonthlyUsd: monthlyUsd,
    savingsPercent: pct,
    annualYearlyUsd,
  };
}
