import type { BillingPeriod } from "@/lib/billing/config";

export type PlanOfferSlug = "starter" | "pro" | "agency";

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
  "All plans include a 7-day free trial — full product, card required, cancel anytime.";

export const PLAN_OFFERS: PlanOffer[] = [
  {
    slug: "starter",
    name: "Starter",
    summary: "For solo media buyers tracking their core market rivals.",
    monthlyUsd: 40,
    annualMonthlyUsd: 40,
    annualYearlyUsd: 480,
    features: [
      "5 competitors tracked",
      "All 6 platforms — Meta, Google, TikTok, LinkedIn, Pinterest, Snapchat",
      "Automatic refresh — no manual work",
      "Full intelligence suite",
      "Strategy Map · Activity Score · Copy Vault · Timeline · Landing Pages · Comparison",
      "Weekly Three Moves AI report",
      "Monday digest email",
      "1 brand workspace · up to 15 swaps/month",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    summary: "For teams that need more competitors, exports, and on-demand refresh.",
    monthlyUsd: 60,
    annualMonthlyUsd: 60,
    annualYearlyUsd: 720,
    plusLabel: "Everything in Starter, plus",
    popular: true,
    features: [
      "15 competitors tracked",
      "1 brand workspace · up to 50 swaps/month",
      "Priority refresh",
      "CSV exports",
      "Manual refresh on demand",
      "Historical snapshots",
      "Emerging Angle Alerts",
    ],
  },
  {
    slug: "agency",
    name: "Agency",
    summary: "For agencies managing multiple client brands in one account.",
    monthlyUsd: 100,
    annualMonthlyUsd: 100,
    annualYearlyUsd: 1200,
    plusLabel: "Everything in Pro, plus",
    features: [
      "Up to 5 brand workspaces — separate competitor lists per client",
      "75 competitor slots (shared across all brands)",
      "All Pro features on every brand",
      "CSV exports · manual refresh · alert rules",
    ],
  },
];

export function annualSavingsPercent(offer: PlanOffer): number {
  const annualFull = offer.monthlyUsd * 12;
  if (annualFull <= 0) return 0;
  return Math.max(0, Math.round((1 - offer.annualYearlyUsd / annualFull) * 100));
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
      primary: `€${monthlyUsd}`,
      secondary: "Billed monthly",
    };
  }

  const pct = annualSavingsPercent(offer);
  const showStrike = annualMonthlyUsd < monthlyUsd;
  return {
    primary: `€${annualMonthlyUsd}`,
    secondary: `Billed annually (€${annualYearlyUsd}/year)`,
    listMonthlyUsd: showStrike ? monthlyUsd : undefined,
    savingsPercent: pct > 0 ? pct : undefined,
    annualYearlyUsd,
  };
}
