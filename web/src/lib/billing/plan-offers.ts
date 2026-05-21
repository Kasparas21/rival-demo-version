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
    summary: "For solo media buyers tracking their core market rivals.",
    monthlyUsd: 79,
    annualMonthlyUsd: 59,
    annualYearlyUsd: 708,
    features: [
      "5 competitors tracked",
      "All 6 platforms — Meta, Google, TikTok, LinkedIn, Pinterest, Snapchat",
      "Automatic refresh — no manual work",
      "Full intelligence suite",
      "Strategy Map · Activity Score · Copy Vault · Timeline · Landing Pages · Comparison",
      "Weekly Three Moves AI report",
      "Monday digest email",
      "1 seat · up to 15 swaps/month",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    summary: "For small agencies tracking competitors across multiple clients.",
    monthlyUsd: 149,
    annualMonthlyUsd: 129,
    annualYearlyUsd: 1548,
    plusLabel: "Everything in Starter, plus",
    popular: true,
    features: [
      "15 competitors tracked",
      "2 seats · up to 50 swaps/month",
      "Priority refresh",
      "CSV exports",
      "Manual refresh on demand",
      "Historical snapshots",
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
      secondary: "Billed monthly",
    };
  }

  const pct = annualSavingsPercent(offer);
  return {
    primary: `$${annualMonthlyUsd}`,
    secondary: `Billed annually ($${annualYearlyUsd}/year)`,
    listMonthlyUsd: monthlyUsd,
    savingsPercent: pct,
    annualYearlyUsd,
  };
}
