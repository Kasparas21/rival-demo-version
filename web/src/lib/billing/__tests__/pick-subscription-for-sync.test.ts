import { describe, expect, it } from "vitest";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import { pickSubscriptionForSync } from "@/lib/billing/sync-polar-subscription";

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    id: "sub_1",
    productId: "prod_starter",
    status: "trialing",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: new Date("2026-06-08T00:00:00.000Z"),
    ...overrides,
  } as Subscription;
}

describe("pickSubscriptionForSync", () => {
  it("prefers active subscriptions scheduled to cancel", () => {
    const picked = pickSubscriptionForSync([
      sub({ id: "sub_active", status: "trialing", cancelAtPeriodEnd: false }),
      sub({ id: "sub_canceling", status: "trialing", cancelAtPeriodEnd: true }),
    ]);

    expect(picked?.id).toBe("sub_canceling");
  });

  it("falls back to the most recent canceled subscription", () => {
    const picked = pickSubscriptionForSync([
      sub({
        id: "sub_old",
        status: "canceled",
        canceledAt: new Date("2026-05-01T00:00:00.000Z"),
      }),
      sub({
        id: "sub_new",
        status: "canceled",
        canceledAt: new Date("2026-05-20T00:00:00.000Z"),
      }),
    ]);

    expect(picked?.id).toBe("sub_new");
  });
});
