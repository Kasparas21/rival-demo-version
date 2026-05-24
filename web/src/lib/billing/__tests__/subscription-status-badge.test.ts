import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBillingSubscriptionUpsertRow,
  isoPolarDate,
} from "@/lib/billing/sync-polar-subscription";
import {
  isBillingActivating,
  subscriptionStatusBadge,
  subscriptionStatusBadgeClassName,
} from "@/lib/billing/entitlements";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";

function billing(overrides: Record<string, unknown> = {}) {
  return {
    status: "none",
    planTier: "free_trial" as const,
    isUnlimited: false,
    cancelAtPeriodEnd: false,
    hasAccess: true,
    polarProductId: null,
    ...overrides,
  };
}

describe("subscriptionStatusBadge", () => {
  it("returns admin access for unlimited accounts", () => {
    expect(subscriptionStatusBadge(billing({ isUnlimited: true }))).toEqual({
      label: "Admin access",
      tone: "sky",
    });
  });

  it("returns canceling when cancel at period end is set", () => {
    expect(
      subscriptionStatusBadge(
        billing({ status: "active", planTier: "starter", cancelAtPeriodEnd: true }),
      ),
    ).toEqual({ label: "Canceling", tone: "amber" });
  });

  it("returns trial active for paid trialing subscriptions", () => {
    expect(
      subscriptionStatusBadge(billing({ status: "trialing", planTier: "starter", polarProductId: "starter-m" })),
    ).toEqual({ label: "Trial active", tone: "sky" });
  });

  it("returns active for paid active subscriptions", () => {
    expect(
      subscriptionStatusBadge(billing({ status: "active", planTier: "pro", polarProductId: "pro-m" })),
    ).toEqual({ label: "Active", tone: "green" });
  });

  it("returns canceled for ended subscriptions", () => {
    expect(subscriptionStatusBadge(billing({ status: "canceled", hasAccess: false }))).toEqual({
      label: "Canceled",
      tone: "red",
    });
  });

  it("returns free trial for workspace trial without polar row", () => {
    expect(subscriptionStatusBadge(billing())).toEqual({ label: "Free trial", tone: "sky" });
  });

  it("returns subscription required when access is blocked", () => {
    expect(subscriptionStatusBadge(billing({ hasAccess: false, planTier: "starter" }))).toEqual({
      label: "Subscription required",
      tone: "amber",
    });
  });
});

describe("subscriptionStatusBadgeClassName", () => {
  it("maps tones to tailwind classes", () => {
    expect(subscriptionStatusBadgeClassName("green")).toContain("emerald");
    expect(subscriptionStatusBadgeClassName("amber")).toContain("amber");
  });
});

describe("isBillingActivating", () => {
  it("detects post-checkout activation window", () => {
    expect(isBillingActivating(billing())).toBe(true);
    expect(
      isBillingActivating(billing({ status: "active", planTier: "starter", polarProductId: "starter-m" })),
    ).toBe(false);
  });
});

describe("buildBillingSubscriptionUpsertRow", () => {
  beforeEach(() => {
    vi.stubEnv("POLAR_STARTER_PRODUCT_ID", "starter-m");
    vi.stubEnv("POLAR_STARTER_ANNUAL_PRODUCT_ID", "starter-a");
    vi.stubEnv("POLAR_PRO_PRODUCT_ID", "pro-m");
    vi.stubEnv("POLAR_PRO_ANNUAL_PRODUCT_ID", "pro-a");
    vi.stubEnv("POLAR_PRODUCT_ID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps polar subscription fields to billing_subscriptions row", () => {
    const subscription = {
      id: "sub_123",
      customerId: "cus_123",
      productId: "starter-m",
      status: "trialing",
      cancelAtPeriodEnd: false,
      checkoutId: "chk_123",
      product: { name: "Starter" },
      trialStart: "2026-05-23T00:00:00.000Z",
      trialEnd: "2026-05-30T00:00:00.000Z",
      currentPeriodStart: "2026-05-23T00:00:00.000Z",
      currentPeriodEnd: "2026-06-23T00:00:00.000Z",
      metadata: { user_id: "user-1" },
    } as unknown as Subscription;

    const row = buildBillingSubscriptionUpsertRow({
      subscription,
      userId: "user-1",
      lastWebhookEventId: "evt_1",
    });

    expect(row.user_id).toBe("user-1");
    expect(row.polar_subscription_id).toBe("sub_123");
    expect(row.polar_product_id).toBe("starter-m");
    expect(row.status).toBe("trialing");
    expect(row.checkout_id).toBe("chk_123");
    expect(row.last_webhook_event_id).toBe("evt_1");
    expect(isoPolarDate("2026-05-23T00:00:00.000Z")).toBe("2026-05-23T00:00:00.000Z");
  });
});
