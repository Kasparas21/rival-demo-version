import type { BillingPeriod } from "@/lib/billing/config";
import { formatPlanPrice } from "@/lib/billing/plan-price-format";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { OnboardingBillingPlan } from "@/lib/i18n/onboarding/types";
import type { PlanPickerCopy } from "@/lib/i18n/onboarding/types";

function annualSavingsPercent(offer: OnboardingBillingPlan): number {
  const annualFull = offer.monthlyUsd * 12;
  return Math.round((1 - offer.annualYearlyUsd / annualFull) * 100);
}

export function maxAnnualSavingsPercentForPlans(plans: OnboardingBillingPlan[]): number {
  return Math.max(...plans.map(annualSavingsPercent));
}

export function localizedPlanPriceDisplay(
  offer: OnboardingBillingPlan,
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
      primary: formatPlanPrice(monthlyUsd),
      secondary: copy.billedMonthly,
    };
  }

  const pct = annualSavingsPercent(offer);
  const showStrike = annualMonthlyUsd < monthlyUsd;
  return {
    primary: formatPlanPrice(annualMonthlyUsd),
    secondary: fillCopyTemplate(copy.billedAnnually, { yearlyUsd: annualYearlyUsd }),
    listMonthlyUsd: showStrike ? monthlyUsd : undefined,
    savingsPercent: pct > 0 ? pct : undefined,
    annualYearlyUsd,
  };
}
