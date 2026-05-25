import { describe, expect, it } from "vitest";
import { applyPolarTrialCompetitorCap } from "@/lib/billing/entitlements";
import { limitsForTier } from "@/lib/billing/plan-limits";

describe("applyPolarTrialCompetitorCap", () => {
  it("caps Starter trialing subscriptions at the free trial competitor limit", () => {
    const limits = applyPolarTrialCompetitorCap(limitsForTier("starter"), "trialing", "starter");
    expect(limits.maxWatchedCompetitors).toBe(limitsForTier("free_trial").maxWatchedCompetitors);
    expect(limits.maxAdsProcessedPerMonth).toBe(limitsForTier("starter").maxAdsProcessedPerMonth);
  });

  it("caps Pro trialing subscriptions at the free trial competitor limit", () => {
    const limits = applyPolarTrialCompetitorCap(limitsForTier("pro"), "trialing", "pro");
    expect(limits.maxWatchedCompetitors).toBe(3);
  });

  it("does not change active Starter subscriptions", () => {
    const limits = applyPolarTrialCompetitorCap(limitsForTier("starter"), "active", "starter");
    expect(limits.maxWatchedCompetitors).toBe(5);
  });

  it("does not change workspace free trial tier", () => {
    const limits = applyPolarTrialCompetitorCap(limitsForTier("free_trial"), "none", "free_trial");
    expect(limits.maxWatchedCompetitors).toBe(3);
  });
});
