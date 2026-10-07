import { describe, expect, it } from "vitest";

import { shouldShowPaywall } from "@/lib/billing/entitlements";
import type { BillingEntitlement } from "@/lib/billing/entitlements";
import { buildPaywallHref, PAYWALL_PATH } from "@/lib/billing/paywall";
import { POST_PAYMENT_ONBOARDING_PATH } from "@/lib/onboarding/phase";

type Slice = Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord">;

function billing(partial: Partial<Slice> & Pick<Slice, "planTier" | "status">): Slice {
  return { isUnlimited: false, hasPolarBillingRecord: false, ...partial };
}

describe("buildPaywallHref", () => {
  it("returns the plan picker with the continue path", () => {
    expect(buildPaywallHref(POST_PAYMENT_ONBOARDING_PATH)).toBe(
      `${PAYWALL_PATH}?next=${encodeURIComponent(POST_PAYMENT_ONBOARDING_PATH)}`,
    );
  });

  it("drops a missing or self-referencing next", () => {
    expect(buildPaywallHref(null)).toBe(PAYWALL_PATH);
    expect(buildPaywallHref("")).toBe(PAYWALL_PATH);
    expect(buildPaywallHref(PAYWALL_PATH)).toBe(PAYWALL_PATH);
  });

  it("refuses next values that leave the site", () => {
    expect(buildPaywallHref("https://example.com")).toBe(PAYWALL_PATH);
    expect(buildPaywallHref("//example.com")).toBe(PAYWALL_PATH);
    expect(buildPaywallHref("/\\example.com")).toBe(PAYWALL_PATH);
    expect(buildPaywallHref("/\texample.com")).toBe(PAYWALL_PATH);
  });
});

describe("shouldShowPaywall", () => {
  it("shows for signups without a plan", () => {
    expect(shouldShowPaywall(billing({ planTier: "free_trial", status: "none" }))).toBe(true);
  });

  it("shows again once a paid subscription is canceled or ended", () => {
    expect(
      shouldShowPaywall(billing({ planTier: "starter", status: "canceled", hasPolarBillingRecord: true })),
    ).toBe(true);
  });

  it("skips admins", () => {
    expect(shouldShowPaywall(billing({ planTier: "admin", status: "active", isUnlimited: true }))).toBe(false);
  });

  it("skips active paid plans, admin plan overrides and comped custom quotes", () => {
    expect(shouldShowPaywall(billing({ planTier: "pro", status: "active" }))).toBe(false);
    expect(shouldShowPaywall(billing({ planTier: "agency", status: "active" }))).toBe(false);
    expect(shouldShowPaywall(billing({ planTier: "custom", status: "active" }))).toBe(false);
  });
});
