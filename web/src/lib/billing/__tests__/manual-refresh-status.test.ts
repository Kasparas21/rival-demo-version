import { describe, expect, it } from "vitest";

import type { BillingEntitlement } from "@/lib/billing/entitlements";
import { limitsForTier } from "@/lib/billing/plan-limits";
import { computeManualRefreshStatus } from "@/lib/billing/manual-refresh-status";

function proBilling(): BillingEntitlement {
  return {
    hasAccess: true,
    status: "active",
    planTier: "pro",
    planName: "Pro",
    polarProductId: null,
    polarCustomerId: null,
    trialEnd: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    limits: limitsForTier("pro"),
    isUnlimited: false,
    canUseDevPlanSwitcher: false,
    devPlanOverride: null,
  };
}

describe("computeManualRefreshStatus", () => {
  it("blocks at workspace monthly cap", () => {
    const s = computeManualRefreshStatus(proBilling(), {
      workspaceRefreshCount: 5,
      lastRefreshAtForCompetitor: null,
    });
    expect(s.canRefreshNow).toBe(false);
    expect(s.blockReason).toBe("monthly_cap");
  });

  it("blocks on per-competitor 24h cooldown", () => {
    const last = new Date(Date.now() - 3_600_000).toISOString();
    const s = computeManualRefreshStatus(proBilling(), {
      workspaceRefreshCount: 1,
      lastRefreshAtForCompetitor: last,
    });
    expect(s.canRefreshNow).toBe(false);
    expect(s.blockReason).toBe("cooldown");
    expect(s.nextRefreshAt).toBeTruthy();
  });
});
