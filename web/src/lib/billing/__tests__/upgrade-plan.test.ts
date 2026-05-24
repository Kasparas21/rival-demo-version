import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildUpgradeToProHref } from "@/lib/billing/checkout-url";
import {
  billingPeriodForProductId,
  isStarterProductId,
  resolveUpgradeProductId,
  shouldRedirectCheckoutToUpgrade,
} from "@/lib/billing/upgrade-plan";

describe("billingPeriodForProductId", () => {
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

  it("maps starter and pro product ids to billing period", () => {
    expect(billingPeriodForProductId("starter-m")).toBe("monthly");
    expect(billingPeriodForProductId("starter-a")).toBe("annual");
    expect(billingPeriodForProductId("pro-m")).toBe("monthly");
    expect(billingPeriodForProductId("pro-a")).toBe("annual");
    expect(billingPeriodForProductId(null)).toBe("monthly");
  });
});

describe("resolveUpgradeProductId", () => {
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

  it("preserves monthly vs annual when upgrading starter to pro", () => {
    expect(resolveUpgradeProductId("starter-m", "pro")).toBe("pro-m");
    expect(resolveUpgradeProductId("starter-a", "pro")).toBe("pro-a");
  });

  it("identifies starter product ids", () => {
    expect(isStarterProductId("starter-m")).toBe(true);
    expect(isStarterProductId("starter-a")).toBe(true);
    expect(isStarterProductId("pro-m")).toBe(false);
  });
});

describe("shouldRedirectCheckoutToUpgrade", () => {
  it("redirects active starter users requesting pro", () => {
    expect(
      shouldRedirectCheckoutToUpgrade({
        requestedPlan: "pro",
        planTier: "starter",
        hasActivePaid: true,
      }),
    ).toBe(true);
  });

  it("does not redirect free trial or pro users", () => {
    expect(
      shouldRedirectCheckoutToUpgrade({
        requestedPlan: "pro",
        planTier: "free_trial",
        hasActivePaid: false,
      }),
    ).toBe(false);
    expect(
      shouldRedirectCheckoutToUpgrade({
        requestedPlan: "pro",
        planTier: "pro",
        hasActivePaid: true,
      }),
    ).toBe(false);
    expect(
      shouldRedirectCheckoutToUpgrade({
        requestedPlan: "starter",
        planTier: "starter",
        hasActivePaid: true,
      }),
    ).toBe(false);
  });
});

describe("buildUpgradeToProHref", () => {
  it("uses prorated upgrade for active starter and checkout otherwise", () => {
    expect(
      buildUpgradeToProHref({ planTier: "starter", status: "active" }),
    ).toBe("/api/billing/upgrade");
    expect(
      buildUpgradeToProHref({ planTier: "starter", status: "trialing" }),
    ).toBe("/api/billing/upgrade");
    expect(
      buildUpgradeToProHref({ planTier: "free_trial", status: "trialing" }),
    ).toBe("/checkout?plan=pro");
    expect(
      buildUpgradeToProHref({ planTier: "pro", status: "active" }),
    ).toBe("/checkout?plan=pro");
  });
});
