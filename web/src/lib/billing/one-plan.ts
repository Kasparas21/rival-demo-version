/**
 * Rival's single plan (16 Oct 2026): a base price that unlocks 5 competitors on every platform,
 * plus add-ons charged only when used. Numbers follow the One plan tab of "Rival Unit Economics".
 * The base price is already 50% off; the list price is worked out from it.
 * Checkout still sells the old Starter/Pro/Agency products until the One plan exists in Polar.
 */
export const ONE_PLAN = {
  monthlyUsd: 19.33,
  discountPercent: 50,
  includedCompetitors: 5,
  includedBrands: 1,
  includedLandingPagesPerCompetitor: 1,
  addOnUsd: { competitor: 5, brand: 12, landingPage: 1 },
} as const;

/** Price before the discount: $19.33 at 50% off is $38.66. */
export const ONE_PLAN_LIST_USD =
  Math.round((ONE_PLAN.monthlyUsd / (1 - ONE_PLAN.discountPercent / 100)) * 100) / 100;

export type OnePlanUsage = {
  competitors: number;
  brands: number;
  extraLandingPages: number;
};

/** Monthly price for a usage mix: the base, plus each add-on beyond what the base includes. */
export function onePlanMonthlyTotal(usage: OnePlanUsage) {
  const extraCompetitors = Math.max(0, usage.competitors - ONE_PLAN.includedCompetitors);
  const extraBrands = Math.max(0, usage.brands - ONE_PLAN.includedBrands);
  const extraLandingPages = Math.max(0, usage.extraLandingPages);
  const competitorsUsd = extraCompetitors * ONE_PLAN.addOnUsd.competitor;
  const brandsUsd = extraBrands * ONE_PLAN.addOnUsd.brand;
  const landingPagesUsd = extraLandingPages * ONE_PLAN.addOnUsd.landingPage;
  return {
    extraCompetitors,
    extraBrands,
    extraLandingPages,
    competitorsUsd,
    brandsUsd,
    landingPagesUsd,
    totalUsd:
      Math.round((ONE_PLAN.monthlyUsd + competitorsUsd + brandsUsd + landingPagesUsd) * 100) / 100,
  };
}

/** "$19.33", or "$5" for whole amounts. */
export function formatUsd(amount: number): string {
  const cents = Math.round(amount * 100);
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
