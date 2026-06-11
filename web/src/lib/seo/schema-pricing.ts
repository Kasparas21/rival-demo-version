import { PLAN_OFFERS } from "@/lib/billing/plan-offers";

/** USD monthly prices for JSON-LD / llms.txt — single source tied to billing plans. */
export const SCHEMA_PLAN_PRICING_USD = {
  starter: PLAN_OFFERS.find((p) => p.slug === "starter")!.monthlyUsd,
  pro: PLAN_OFFERS.find((p) => p.slug === "pro")!.monthlyUsd,
} as const;

export function schemaOfferJsonLd(name: string, monthlyUsd: number) {
  return {
    "@type": "Offer" as const,
    name,
    price: String(monthlyUsd),
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification" as const,
      price: String(monthlyUsd),
      priceCurrency: "USD",
      billingIncrement: 1,
      unitText: "MONTH",
    },
  };
}
