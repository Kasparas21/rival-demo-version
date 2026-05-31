import { describe, expect, it } from "vitest";

import { hasActivePaidSubscription } from "@/lib/billing/entitlements";
import {
  hasPrePaymentSetup,
  POST_PAYMENT_ONBOARDING_PATH,
  resolveIncompleteOnboardingPath,
  shouldResumePostPaymentOnboarding,
} from "@/lib/onboarding/phase";

describe("onboarding phase helpers", () => {
  it("detects pre-payment setup from profile", () => {
    expect(hasPrePaymentSetup({ company_url: "nike.com", onboarding_completed: false })).toBe(true);
    expect(hasPrePaymentSetup({ company_url: "nike.com", onboarding_completed: true })).toBe(false);
    expect(hasPrePaymentSetup({ company_url: null, onboarding_completed: false })).toBe(false);
  });

  it("resolves unpaid pre-payment users to choose-plan", () => {
    const path = resolveIncompleteOnboardingPath(
      { company_url: "nike.com", onboarding_completed: false },
      { planTier: "free_trial", status: "none", isUnlimited: false },
    );
    expect(path).toContain("/choose-plan");
    expect(path).toContain(encodeURIComponent(POST_PAYMENT_ONBOARDING_PATH));
  });

  it("resolves paid pre-payment users to post-payment onboarding", () => {
    const billing = { planTier: "starter" as const, status: "active", isUnlimited: false };
    expect(hasActivePaidSubscription(billing)).toBe(true);
    expect(
      shouldResumePostPaymentOnboarding({ company_url: "nike.com", onboarding_completed: false }, billing),
    ).toBe(true);
    const path = resolveIncompleteOnboardingPath(
      { company_url: "nike.com", onboarding_completed: false },
      billing,
    );
    expect(path).toBe(POST_PAYMENT_ONBOARDING_PATH);
  });
});
