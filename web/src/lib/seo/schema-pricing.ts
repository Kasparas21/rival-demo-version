import { PLAN_OFFERS } from "@/lib/billing/plan-offers";
import { LANDING_PRICE_CURRENCY } from "@/lib/billing/plan-price-format";

/** Monthly prices for JSON-LD / llms.txt — single source tied to billing plans (USD on landing). */
export const SCHEMA_PLAN_PRICING_USD = {
  starter: PLAN_OFFERS.find((p) => p.slug === "starter")!.monthlyUsd,
  pro: PLAN_OFFERS.find((p) => p.slug === "pro")!.monthlyUsd,
  agency: PLAN_OFFERS.find((p) => p.slug === "agency")!.monthlyUsd,
} as const;

export function schemaOfferJsonLd(name: string, monthlyUsd: number) {
  return {
    "@type": "Offer" as const,
    name,
    price: String(monthlyUsd),
    priceCurrency: LANDING_PRICE_CURRENCY,
    priceSpecification: {
      "@type": "UnitPriceSpecification" as const,
      price: String(monthlyUsd),
      priceCurrency: LANDING_PRICE_CURRENCY,
      billingIncrement: 1,
      unitText: "MONTH",
    },
  };
}
