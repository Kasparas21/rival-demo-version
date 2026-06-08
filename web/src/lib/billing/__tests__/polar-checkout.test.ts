import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requirePolarProductIdForPlan, resolvePolarCheckoutProducts } from "@/lib/billing/polar-checkout";

describe("polar-checkout", () => {
  beforeEach(() => {
    vi.stubEnv("POLAR_STARTER_PRODUCT_ID", "starter-m");
    vi.stubEnv("POLAR_STARTER_ANNUAL_PRODUCT_ID", "starter-a");
    vi.stubEnv("POLAR_PRO_PRODUCT_ID", "pro-m");
    vi.stubEnv("POLAR_PRO_ANNUAL_PRODUCT_ID", "pro-a");
    vi.stubEnv("POLAR_PRODUCT_ID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires starter product env instead of silent legacy fallback", () => {
    vi.stubEnv("POLAR_STARTER_PRODUCT_ID", "");
    expect(() => requirePolarProductIdForPlan("starter", "monthly")).toThrow(/POLAR_STARTER_PRODUCT_ID/);
  });

  it("builds checkout payload using catalog product id only", async () => {
    const polar = {
      products: {
        get: vi.fn().mockResolvedValue({
          name: "Starter",
          isArchived: false,
          prices: [
            {
              id: "price-1",
              amountType: "fixed",
              isArchived: false,
              priceAmount: 7900,
              priceCurrency: "eur",
            },
          ],
        }),
      },
    };

    const payload = await resolvePolarCheckoutProducts(polar as never, "starter", "monthly");
    expect(payload).toEqual({ products: ["starter-m"] });
    expect(payload).not.toHaveProperty("prices");
  });
});
