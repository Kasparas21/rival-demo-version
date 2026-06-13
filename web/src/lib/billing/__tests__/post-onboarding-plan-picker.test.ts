import { describe, expect, it } from "vitest";
import { annualSavingsPercent, PLAN_OFFERS } from "@/lib/billing/plan-offers";
import {
  hasActivePaidSubscription,
  shouldShowPostOnboardingPlanPicker,
} from "@/lib/billing/entitlements";
import type { BillingEntitlement } from "@/lib/billing/entitlements";

function billing(
  partial: Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord">,
): Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord"> {
  return { hasPolarBillingRecord: false, ...partial };
}

describe("post-onboarding plan picker", () => {
  it("shows for free_trial tier (hasAccess true but no paid Polar sub)", () => {
    expect(
      shouldShowPostOnboardingPlanPicker(billing({ planTier: "free_trial", status: "none", isUnlimited: false })),
    ).toBe(true);
  });

  it("hides when Starter is trialing", () => {
    expect(
      shouldShowPostOnboardingPlanPicker(billing({ planTier: "starter", status: "trialing", isUnlimited: false })),
    ).toBe(false);
    expect(hasActivePaidSubscription(billing({ planTier: "starter", status: "trialing", isUnlimited: false }))).toBe(
      true,
    );
  });

  it("hides when Polar checkout record exists but subscription sync is still pending", () => {
    expect(
      shouldShowPostOnboardingPlanPicker(
        billing({ planTier: "free_trial", status: "none", isUnlimited: false, hasPolarBillingRecord: true }),
      ),
    ).toBe(false);
  });

  it("computes zero annual savings when monthly and annual rates match", () => {
    expect(annualSavingsPercent(PLAN_OFFERS[0]!)).toBe(0);
  });

  it("hides for admin unlimited", () => {
    expect(
      shouldShowPostOnboardingPlanPicker(billing({ planTier: "admin", status: "active", isUnlimited: true })),
    ).toBe(false);
  });
});
