import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { buildSignupAfterOnboardingPath, SIGNUP_AFTER_ONBOARDING_PATH } from "@/lib/auth/trial-flow";
import { TESTER_FULL_PRO_PAYLOAD_KEY } from "@/lib/billing/claim-tester-access-core";
import {
  isTesterFullProAccount,
  isTesterInviteBillingAccount,
} from "@/lib/billing/entitlements";
import {
  getTesterInviteConfig,
  matchesTesterInviteCode,
  normalizeInviteCode,
} from "@/lib/billing/tester-invite";

describe("Barcelona invite flow", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      TESTER_INVITE_CODE: "barcelona",
      TESTER_INVITE_MAX_USES: "50",
      TESTER_INVITE_EXPIRES_AT: "2026-12-31T23:59:59.000Z",
    };
  });

  afterEach(() => {
    process.env = env;
  });

  it("matches barcelona invite code case-insensitively", () => {
    expect(matchesTesterInviteCode("Barcelona")).toBe(true);
    expect(normalizeInviteCode("Barcelona")).toBe("barcelona");
    expect(getTesterInviteConfig()?.code).toBe("barcelona");
  });

  it("builds signup path with tester param after guest onboarding", () => {
    const path = buildSignupAfterOnboardingPath("barcelona");
    expect(path).toContain("/signup");
    expect(path).toContain("tester=barcelona");
    expect(path).toContain(encodeURIComponent("/choose-plan"));
    expect(buildSignupAfterOnboardingPath(null)).toBe(SIGNUP_AFTER_ONBOARDING_PATH);
  });

  it("grants full Pro limits when tester_full_pro is set on billing payload", () => {
    const payload = {
      tester_invite: "barcelona",
      [TESTER_FULL_PRO_PAYLOAD_KEY]: true,
    };
    expect(isTesterInviteBillingAccount(payload, true)).toBe(true);
    expect(isTesterFullProAccount(payload)).toBe(true);
  });

  it("legacy tester accounts without tester_full_pro are not full Pro", () => {
    const payload = { tester_invite: "legacy" };
    expect(isTesterInviteBillingAccount(payload, true)).toBe(true);
    expect(isTesterFullProAccount(payload)).toBe(false);
  });
});
