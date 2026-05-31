import type { CheckoutCreate } from "@polar-sh/sdk/models/components/checkoutcreate";
import type { Polar } from "@polar-sh/sdk";

import {
  getPolarProductIds,
  polarProductIdForPlan,
  type BillingPeriod,
  type PolarPlanSlug,
} from "@/lib/billing/config";

const PLAN_ENV_HINT: Record<PolarPlanSlug, { monthly: string; annual: string }> = {
  starter: {
    monthly: "POLAR_STARTER_PRODUCT_ID",
    annual: "POLAR_STARTER_ANNUAL_PRODUCT_ID",
  },
  pro: {
    monthly: "POLAR_PRO_PRODUCT_ID",
    annual: "POLAR_PRO_ANNUAL_PRODUCT_ID",
  },
};

function hasActiveCatalogPrice(prices: { amountType?: string; isArchived?: boolean }[] | null | undefined): boolean {
  return (prices ?? []).some(
    (price) => price.amountType === "fixed" && price.isArchived !== true,
  );
}

/** Ensures plan env is set — avoids silent fallback to a dead legacy product id. */
export function requirePolarProductIdForPlan(plan: PolarPlanSlug, period: BillingPeriod): string {
  const ids = getPolarProductIds();
  const envKey =
    period === "annual" ? PLAN_ENV_HINT[plan].annual : PLAN_ENV_HINT[plan].monthly;
  const configured =
    period === "annual"
      ? plan === "starter"
        ? ids.starterAnnual
        : ids.proAnnual
      : plan === "starter"
        ? ids.starter
        : ids.pro;

  if (!configured?.trim()) {
    throw new Error(
      `${envKey} is missing. In Polar → Catalogue, open the product (e.g. "${plan === "starter" ? "Starter" : "Pro"}${period === "annual" ? " (Annual)" : ""}"), copy its Product ID (UUID), paste into .env.local, then restart \`npm run dev\`. Do not use the Share link URL.`,
    );
  }

  return polarProductIdForPlan(plan, period);
}

/**
 * Resolve Polar product for checkout.create. Uses catalog prices on the product (no ad-hoc price overrides).
 */
export async function resolvePolarCheckoutProducts(
  polar: Polar,
  plan: PolarPlanSlug,
  period: BillingPeriod,
): Promise<Pick<CheckoutCreate, "products">> {
  const productId = requirePolarProductIdForPlan(plan, period);
  const product = await polar.products.get({ id: productId });

  if (product.isArchived) {
    throw new Error(
      `Polar product "${product.name}" is archived. Reactivate it in Polar → Catalogue or update ${PLAN_ENV_HINT[plan][period === "annual" ? "annual" : "monthly"]}.`,
    );
  }

  if (!hasActiveCatalogPrice(product.prices)) {
    throw new Error(
      `Polar product "${product.name}" has no active price. In Polar → Catalogue → ${product.name}, add a recurring price (monthly or annual) and ensure it is active.`,
    );
  }

  return {
    products: [productId],
  };
}
