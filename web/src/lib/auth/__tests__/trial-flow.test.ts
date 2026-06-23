import { describe, expect, it } from "vitest";

import {
  CHOOSE_PLAN_AFTER_TRIAL_PATH,
  SIGNUP_AFTER_ONBOARDING_PATH,
  TRIAL_COMPLETE_PATH,
  buildSignupAfterOnboardingPath,
  getTrialStartHref,
  isPostGuestSignupPath,
  isTrialCompletePath,
  resolveAuthCallbackNext,
  shouldRedirectToTrialComplete,
} from "@/lib/auth/trial-flow";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/oauth-bridge-cookies";
import { POST_PAYMENT_ONBOARDING_PATH } from "@/lib/onboarding/phase";

describe("trial-flow", () => {
  it("builds onboarding href with optional domain", () => {
    expect(getTrialStartHref()).toBe("/onboarding");
    expect(getTrialStartHref("nike.com")).toBe("/onboarding?domain=nike.com");
  });

  it("links signup straight to plan picker after guest onboarding", () => {
    expect(SIGNUP_AFTER_ONBOARDING_PATH).toContain(encodeURIComponent("/choose-plan"));
    expect(buildSignupAfterOnboardingPath("barcelona")).toContain("tester=barcelona");
    expect(CHOOSE_PLAN_AFTER_TRIAL_PATH).toContain("/choose-plan");
    expect(CHOOSE_PLAN_AFTER_TRIAL_PATH).toContain(encodeURIComponent(POST_PAYMENT_ONBOARDING_PATH));
  });

  it("detects post-guest signup paths", () => {
    expect(isTrialCompletePath("/trial/complete")).toBe(true);
    expect(isPostGuestSignupPath("/trial/complete")).toBe(true);
    expect(isPostGuestSignupPath(CHOOSE_PLAN_AFTER_TRIAL_PATH)).toBe(true);
    expect(isPostGuestSignupPath("/onboarding?resume=1")).toBe(true);
    expect(isPostGuestSignupPath("/onboarding")).toBe(false);
  });

  it("routes trial funnel when next is missing but pending cookie is set", () => {
    expect(shouldRedirectToTrialComplete(null, "1")).toBe(true);
    expect(shouldRedirectToTrialComplete("/dashboard/spy", undefined)).toBe(false);
  });

  it("reads OAuth next from bridge cookie when query param is absent", () => {
    const cookies = {
      get: (name: string) =>
        name === OAUTH_NEXT_COOKIE ? { value: encodeURIComponent(CHOOSE_PLAN_AFTER_TRIAL_PATH) } : undefined,
    };
    expect(resolveAuthCallbackNext(null, cookies)).toBe(CHOOSE_PLAN_AFTER_TRIAL_PATH);
  });
});
