import type { CheckoutCreate } from "@polar-sh/sdk/models/components/checkoutcreate";
import type { Polar } from "@polar-sh/sdk";

import { getPolarCustomProductId } from "@/lib/billing/config";
import type { CustomQuoteRow } from "@/lib/billing/custom-quotes";

function hasActiveCatalogPrice(prices: { amountType?: string; isArchived?: boolean }[] | null | undefined): boolean {
  return (prices ?? []).some(
    (price) => price.amountType === "fixed" && price.isArchived !== true,
  );
}

export async function resolvePolarCustomCheckout(
  polar: Polar,
  quote: Pick<CustomQuoteRow, "price_cents" | "currency" | "billing_period">,
): Promise<Pick<CheckoutCreate, "products" | "prices">> {
  const productId = getPolarCustomProductId();
  const product = await polar.products.get({ id: productId });

  if (product.isArchived) {
    throw new Error(
      `Polar custom product "${product.name}" is archived. Reactivate it in Polar → Catalogue or update POLAR_CUSTOM_PRODUCT_ID.`,
    );
  }

  if (!hasActiveCatalogPrice(product.prices)) {
    throw new Error(
      `Polar custom product "${product.name}" needs at least one catalog price (used as template). Add a recurring price in Polar → Catalogue.`,
    );
  }

  const currency = (quote.currency?.trim().toLowerCase() || "gbp") as "gbp" | "usd" | "eur";

  return {
    products: [productId],
    prices: {
      [productId]: [
        {
          amountType: "fixed",
          priceAmount: quote.price_cents,
          priceCurrency: currency,
        },
      ],
    },
  };
}
