/** Display currency for plan pricing (marketing, checkout UI, JSON-LD). */
export const PLAN_PRICE_CURRENCY = "GBP" as const;
export const PLAN_PRICE_SYMBOL = "£";

export function formatPlanPrice(amount: number): string {
  return `${PLAN_PRICE_SYMBOL}${amount}`;
}
