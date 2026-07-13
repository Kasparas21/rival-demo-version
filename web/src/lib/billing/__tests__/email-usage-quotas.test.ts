import { describe, expect, it } from "vitest";

import type { BillingEntitlement } from "@/lib/billing/entitlements";
import { limitsForTier } from "@/lib/billing/plan-limits";
import { canCreateEmailTracker, canRunEmailAiAnalysis } from "@/lib/billing/usage-quotas";

function billingForTier(tier: BillingEntitlement["planTier"], unlimited = false): BillingEntitlement {
  return {
    hasAccess: true,
    status: "active",
    planTier: tier,
    planName: tier,
    polarProductId: null,
    polarCustomerId: null,
    polarSubscriptionId: null,
    hasPolarBillingRecord: false,
    trialEnd: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    limits: limitsForTier(tier),
    isUnlimited: unlimited,
    canUseDevPlanSwitcher: false,
    devPlanOverride: null,
    adminPlanOverride: null,
    customQuote: null,
    pendingQuote: null,
    customPriceLabel: null,
  };
}

describe("canCreateEmailTracker", () => {
  it("allows free trial with no trackers", () => {
    const result = canCreateEmailTracker(billingForTier("free_trial"), 0);
    expect(result.ok).toBe(true);
  });

  it("blocks free trial at tracker limit", () => {
    const result = canCreateEmailTracker(billingForTier("free_trial"), 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(402);
    }
  });

  it("allows unlimited admin", () => {
    const result = canCreateEmailTracker(billingForTier("admin", true), 999);
    expect(result.ok).toBe(true);
  });
});

describe("canRunEmailAiAnalysis", () => {
  it("allows starter under monthly cap", () => {
    const result = canRunEmailAiAnalysis(billingForTier("starter"), 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.remaining).toBe(5);
    }
  });

  it("blocks free trial at monthly cap", () => {
    const result = canRunEmailAiAnalysis(billingForTier("free_trial"), 5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.quotaExceeded).toBe(true);
      expect(result.status).toBe(402);
    }
  });

  it("allows admin unlimited", () => {
    const result = canRunEmailAiAnalysis(billingForTier("admin", true), 10_000);
    expect(result.ok).toBe(true);
  });
});
