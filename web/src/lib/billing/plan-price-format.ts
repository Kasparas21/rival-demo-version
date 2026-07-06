/** Display currency for plan pricing (checkout UI, onboarding). */
export const PLAN_PRICE_CURRENCY = "GBP" as const;
export const PLAN_PRICE_SYMBOL = "£";

/** Landing page display currency (same numeric amounts as GBP plans). */
export const LANDING_PRICE_CURRENCY = "USD" as const;
export const LANDING_PRICE_SYMBOL = "$";

export function formatPlanPrice(amount: number): string {
  return `${PLAN_PRICE_SYMBOL}${amount}`;
}

export function formatLandingPlanPrice(amount: number): string {
  return `${LANDING_PRICE_SYMBOL}${amount}`;
}
