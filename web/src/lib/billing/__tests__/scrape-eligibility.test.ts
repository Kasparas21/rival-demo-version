import { describe, expect, it } from "vitest";

import type { BillingEntitlement } from "@/lib/billing/entitlements";
import { limitsForTier } from "@/lib/billing/plan-limits";
import {
  isScrapingPausedForInactiveUser,
  resolveScrapeEligibility,
  resolveScheduledAdsScrapeAllowed,
} from "@/lib/billing/scrape-eligibility";
import { isLapsedPaidSubscription } from "@/lib/billing/entitlements";
import {
  daysSinceUtcDateYmd,
  INACTIVE_SCRAPE_PAUSE_DAYS,
  isUserInactiveForScrape,
  resolveLastActiveDateYmd,
} from "@/lib/billing/user-activity";

function billingForTier(tier: BillingEntitlement["planTier"], overrides: Partial<BillingEntitlement> = {}): BillingEntitlement {
  return {
    hasAccess: true,
    status: tier === "free_trial" ? "none" : "active",
    planTier: tier,
    planName: tier,
    polarProductId: tier === "free_trial" ? null : "prod_test",
    polarCustomerId: null,
    polarSubscriptionId: null,
    hasPolarBillingRecord: tier !== "free_trial",
    trialEnd: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    limits: limitsForTier(tier),
    isUnlimited: false,
    canUseDevPlanSwitcher: false,
    devPlanOverride: null,
    adminPlanOverride: null,
    adminAdsScrapeMode: "auto",
    customQuote: null,
    pendingQuote: null,
    customPriceLabel: null,
    ...overrides,
  };
}

function ymdDaysAgo(days: number, now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

describe("isUserInactiveForScrape", () => {
  const now = new Date("2026-07-07T15:00:00.000Z");

  it("treats missing activity as inactive", () => {
    expect(isUserInactiveForScrape({ lastActiveDate: null, updatedAt: null, createdAt: null }, now)).toBe(true);
  });

  it("allows users active within the window", () => {
    expect(
      isUserInactiveForScrape(
        { lastActiveDate: ymdDaysAgo(3, now), updatedAt: null, createdAt: null },
        now,
      ),
    ).toBe(false);
  });

  it("pauses users inactive for the full window", () => {
    expect(
      isUserInactiveForScrape(
        { lastActiveDate: ymdDaysAgo(INACTIVE_SCRAPE_PAUSE_DAYS, now), updatedAt: null, createdAt: null },
        now,
      ),
    ).toBe(true);
  });

  it("falls back to updated_at when last_active_date is missing", () => {
    expect(
      resolveLastActiveDateYmd({
        lastActiveDate: null,
        updatedAt: `${ymdDaysAgo(2, now)}T10:00:00.000Z`,
        createdAt: null,
      }),
    ).toBe(ymdDaysAgo(2, now));
  });
});

describe("isScrapingPausedForInactiveUser", () => {
  const now = new Date("2026-07-07T15:00:00.000Z");

  it("pauses inactive free-trial users", () => {
    expect(
      isScrapingPausedForInactiveUser({
        activity: { lastActiveDate: ymdDaysAgo(10, now), updatedAt: null, createdAt: null },
        billing: billingForTier("free_trial"),
        now,
      }),
    ).toBe(true);
  });

  it("does not pause recently active free-trial users", () => {
    expect(
      isScrapingPausedForInactiveUser({
        activity: { lastActiveDate: ymdDaysAgo(2, now), updatedAt: null, createdAt: null },
        billing: billingForTier("free_trial"),
        now,
      }),
    ).toBe(false);
  });

  it("pauses inactive paid starter users", () => {
    expect(
      isScrapingPausedForInactiveUser({
        activity: { lastActiveDate: ymdDaysAgo(30, now), updatedAt: null, createdAt: null },
        billing: billingForTier("starter"),
        now,
      }),
    ).toBe(true);
  });

  it("does not pause admin unlimited users", () => {
    expect(
      isScrapingPausedForInactiveUser({
        activity: { lastActiveDate: ymdDaysAgo(30, now), updatedAt: null, createdAt: null },
        billing: billingForTier("admin", { isUnlimited: true }),
        now,
      }),
    ).toBe(false);
  });
});

describe("daysSinceUtcDateYmd", () => {
  it("counts whole UTC days", () => {
    const now = new Date("2026-07-07T15:00:00.000Z");
    expect(daysSinceUtcDateYmd("2026-07-01", now)).toBe(6);
    expect(daysSinceUtcDateYmd("2026-06-30", now)).toBe(7);
  });
});

describe("resolveScrapeEligibility", () => {
  const now = new Date("2026-07-07T15:00:00.000Z");
  const recentActivity = { lastActiveDate: ymdDaysAgo(1, now), updatedAt: null, createdAt: null };

  it("blocks lapsed paid subscriptions even when recently active", () => {
    const billing = billingForTier("free_trial", {
      status: "canceled",
      hasPolarBillingRecord: true,
      polarProductId: "prod_test",
    });
    expect(isLapsedPaidSubscription(billing)).toBe(true);
    expect(resolveScrapeEligibility({ activity: recentActivity, billing, now }).allowed).toBe(false);
  });

  it("allows never-subscribed free trial users who were recently active", () => {
    const billing = billingForTier("free_trial", {
      status: "none",
      hasPolarBillingRecord: false,
      polarProductId: null,
    });
    expect(resolveScrapeEligibility({ activity: recentActivity, billing, now }).allowed).toBe(true);
  });
});

describe("resolveScheduledAdsScrapeAllowed", () => {
  const now = new Date("2026-07-07T15:00:00.000Z");
  const recentActivity = { lastActiveDate: ymdDaysAgo(1, now), updatedAt: null, createdAt: null };

  function eligibilityFor(
    tier: BillingEntitlement["planTier"],
    overrides: Partial<BillingEntitlement> = {},
  ) {
    const billing = billingForTier(tier, overrides);
    return resolveScrapeEligibility({ activity: recentActivity, billing, now });
  }

  it("blocks scheduled scrapes when admin mode is manual", () => {
    const eligibility = eligibilityFor("pro", { adminAdsScrapeMode: "manual" });
    expect(eligibility.allowed).toBe(true);
    expect(resolveScheduledAdsScrapeAllowed(eligibility)).toBe(false);
  });

  it("still allows fresh scrape eligibility for manual mode users", () => {
    const eligibility = eligibilityFor("pro", { adminAdsScrapeMode: "manual" });
    expect(eligibility.allowed).toBe(true);
  });

  it("allows scheduled scrapes for paid pro users on auto mode", () => {
    const eligibility = eligibilityFor("pro", { adminAdsScrapeMode: "auto" });
    expect(resolveScheduledAdsScrapeAllowed(eligibility)).toBe(true);
  });

  it("allows scheduled scrapes when admin mode is absent (defaults to auto)", () => {
    const eligibility = eligibilityFor("pro");
    expect(resolveScheduledAdsScrapeAllowed(eligibility)).toBe(true);
  });

  it("allows scheduled scrapes for unlimited admin users on auto mode", () => {
    const eligibility = eligibilityFor("admin", { isUnlimited: true, adminAdsScrapeMode: "auto" });
    expect(resolveScheduledAdsScrapeAllowed(eligibility)).toBe(true);
  });

  it("blocks scheduled scrapes for unlimited admin users on manual mode", () => {
    const eligibility = eligibilityFor("admin", { isUnlimited: true, adminAdsScrapeMode: "manual" });
    expect(resolveScheduledAdsScrapeAllowed(eligibility)).toBe(false);
  });

  it("blocks scheduled scrapes for inactive users regardless of mode", () => {
    const billing = billingForTier("pro", { adminAdsScrapeMode: "auto" });
    const eligibility = resolveScrapeEligibility({
      activity: { lastActiveDate: ymdDaysAgo(30, now), updatedAt: null, createdAt: null },
      billing,
      now,
    });
    expect(resolveScheduledAdsScrapeAllowed(eligibility)).toBe(false);
  });
});
