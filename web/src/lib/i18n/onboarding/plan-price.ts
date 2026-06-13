import type { BillingPeriod } from "@/lib/billing/config";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { LandingPlanOffer } from "@/lib/i18n/landing/types";
import type { PlanPickerCopy } from "@/lib/i18n/onboarding/types";

function annualSavingsPercent(offer: LandingPlanOffer): number {
  const annualFull = offer.monthlyUsd * 12;
  return Math.round((1 - offer.annualYearlyUsd / annualFull) * 100);
}

export function maxAnnualSavingsPercentForPlans(plans: LandingPlanOffer[]): number {
  return Math.max(...plans.map(annualSavingsPercent));
}

export function localizedPlanPriceDisplay(
  offer: LandingPlanOffer,
  billing: BillingPeriod,
  copy: PlanPickerCopy,
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
      secondary: copy.billedMonthly,
    };
  }

  const pct = annualSavingsPercent(offer);
  const showStrike = annualMonthlyUsd < monthlyUsd;
  return {
    primary: `€${annualMonthlyUsd}`,
    secondary: fillCopyTemplate(copy.billedAnnually, { yearlyUsd: annualYearlyUsd }),
    listMonthlyUsd: showStrike ? monthlyUsd : undefined,
    savingsPercent: pct > 0 ? pct : undefined,
    annualYearlyUsd,
  };
}
