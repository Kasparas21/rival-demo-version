import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveAdsCacheDomainForUser = vi.fn();
const getBillingEntitlement = vi.fn();
const countWatchedCompetitorSlotsForUser = vi.fn();

vi.mock("@/lib/ad-library/competitor-cache-domain", () => ({
  resolveAdsCacheDomainForUser: (...a: unknown[]) => resolveAdsCacheDomainForUser(...a),
}));
vi.mock("@/lib/billing/entitlements", () => ({ getBillingEntitlement: (...a: unknown[]) => getBillingEntitlement(...a) }));
vi.mock("@/lib/billing/brand-competitor-slots", () => ({
  countWatchedCompetitorSlotsForUser: (...a: unknown[]) => countWatchedCompetitorSlotsForUser(...a),
}));

import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import type { Database } from "@/lib/supabase/types";

function fakeSupabase() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  return { client: { from: () => ({ upsert }) } as unknown as SupabaseClient<Database>, upsert };
}

beforeEach(() => {
  resolveAdsCacheDomainForUser.mockReset().mockResolvedValue({ competitorId: null });
  getBillingEntitlement.mockReset().mockResolvedValue({ isUnlimited: false, limits: { maxWatchedCompetitors: 3 } });
  countWatchedCompetitorSlotsForUser.mockReset().mockResolvedValue({ count: 1 });
});

describe("ensureSavedCompetitorForStrategyOverview", () => {
  it("creates a missing competitor while under the plan limit", async () => {
    const { client, upsert } = fakeSupabase();
    await ensureSavedCompetitorForStrategyOverview(client, "u1", "rothys.com");
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("never creates past the plan limit", async () => {
    countWatchedCompetitorSlotsForUser.mockResolvedValue({ count: 3 });
    const { client, upsert } = fakeSupabase();
    await ensureSavedCompetitorForStrategyOverview(client, "u1", "rothys.com");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("lets unlimited accounts create regardless of the count", async () => {
    getBillingEntitlement.mockResolvedValue({ isUnlimited: true, limits: { maxWatchedCompetitors: 3 } });
    countWatchedCompetitorSlotsForUser.mockResolvedValue({ count: 99 });
    const { client, upsert } = fakeSupabase();
    await ensureSavedCompetitorForStrategyOverview(client, "u1", "rothys.com");
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the competitor already exists", async () => {
    resolveAdsCacheDomainForUser.mockResolvedValue({ competitorId: "c1" });
    const { client, upsert } = fakeSupabase();
    await ensureSavedCompetitorForStrategyOverview(client, "u1", "rothys.com");
    expect(upsert).not.toHaveBeenCalled();
    expect(getBillingEntitlement).not.toHaveBeenCalled();
  });
});
