import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isKnownPolarProductId,
  polarProductIdForPlan,
} from "@/lib/billing/config";
import { buildCheckoutHref } from "@/lib/billing/checkout-url";

describe("polarProductIdForPlan", () => {
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

  it("maps monthly and annual product ids", () => {
    expect(polarProductIdForPlan("starter", "monthly")).toBe("starter-m");
    expect(polarProductIdForPlan("starter", "annual")).toBe("starter-a");
    expect(polarProductIdForPlan("pro", "monthly")).toBe("pro-m");
    expect(polarProductIdForPlan("pro", "annual")).toBe("pro-a");
  });

  it("recognizes all configured product ids for webhooks", () => {
    for (const id of ["starter-m", "starter-a", "pro-m", "pro-a"]) {
      expect(isKnownPolarProductId(id)).toBe(true);
    }
    expect(isKnownPolarProductId("unknown")).toBe(false);
  });
});

describe("buildCheckoutHref", () => {
  it("adds period=annual only for annual checkout", () => {
    expect(buildCheckoutHref("starter", "monthly")).toBe("/checkout?plan=starter");
    expect(buildCheckoutHref("pro", "annual")).toBe("/checkout?plan=pro&period=annual");
  });

  it("preserves next through checkout for Polar return", () => {
    const next = "/onboarding?phase=post_payment";
    expect(buildCheckoutHref("starter", "monthly", next)).toBe(
      `/checkout?plan=starter&next=${encodeURIComponent(next)}`,
    );
  });
});
