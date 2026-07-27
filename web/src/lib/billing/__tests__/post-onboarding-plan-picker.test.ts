import { describe, expect, it } from "vitest";
import { annualSavingsPercent, PLAN_OFFERS } from "@/lib/billing/plan-offers";
import {
  hasActivePaidSubscription,
  shouldShowAwaitingQuotePage,
  shouldShowPostOnboardingPlanPicker,
} from "@/lib/billing/entitlements";
import type { BillingEntitlement } from "@/lib/billing/entitlements";

function billing(
  partial: Partial<
    Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord" | "isAdminSuspended">
  > &
    Pick<BillingEntitlement, "planTier" | "status" | "isUnlimited">,
): Pick<
  BillingEntitlement,
  "planTier" | "status" | "isUnlimited" | "hasPolarBillingRecord" | "isAdminSuspended"
> {
  return { hasPolarBillingRecord: false, isAdminSuspended: false, ...partial };
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

  it("shows for users with Polar billing record but no active subscription", () => {
    expect(
      shouldShowPostOnboardingPlanPicker(
        billing({ planTier: "free_trial", status: "none", isUnlimited: false, hasPolarBillingRecord: true }),
      ),
    ).toBe(true);
  });

  it("computes annual savings at 20% off monthly × 12", () => {
    expect(annualSavingsPercent(PLAN_OFFERS[0]!)).toBe(20);
  });

  it("hides for admin unlimited", () => {
    expect(
      shouldShowPostOnboardingPlanPicker(billing({ planTier: "admin", status: "active", isUnlimited: true })),
    ).toBe(false);
  });

  it("hides awaiting-quote redirect for admin-suspended read-only users", () => {
    const suspended = billing({
      planTier: "free_trial",
      status: "canceled",
      isUnlimited: false,
      isAdminSuspended: true,
    });
    expect(shouldShowAwaitingQuotePage(suspended)).toBe(false);
    expect(shouldShowPostOnboardingPlanPicker(suspended)).toBe(false);
  });
});
