import { describe, expect, it, vi } from "vitest";

import { guardMetaSweepCap, isSuspectedTruncatedSweep } from "@/lib/ad-library/meta-sweep-guard";

describe("isSuspectedTruncatedSweep", () => {
  it("flags a drop below half of the previous sweep", () => {
    expect(isSuspectedTruncatedSweep(49, 100)).toBe(true);
    expect(isSuspectedTruncatedSweep(50, 100)).toBe(false);
    expect(isSuspectedTruncatedSweep(120, 100)).toBe(false);
  });

  it("ignores small advertisers and the first sweep", () => {
    expect(isSuspectedTruncatedSweep(1, 9)).toBe(false);
    expect(isSuspectedTruncatedSweep(1, null)).toBe(false);
  });
});

/** Fake of the two `competitor_platform_tracking` calls the guard makes. */
function fakeSupabase(row: { last_sweep_ad_count: number | null } | null) {
  const updates: unknown[] = [];
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: row, error: null }),
    update: (values: unknown) => {
      updates.push(values);
      return { eq: () => ({ eq: async () => ({ error: null }) }) };
    },
  };
  return { client: { from: vi.fn(() => chain) } as never, updates };
}

describe("guardMetaSweepCap", () => {
  it("withholds the cap once when a sweep looks cut short, then accepts the confirmed count", async () => {
    const first = fakeSupabase({ last_sweep_ad_count: 106 });
    expect(await guardMetaSweepCap(first.client, { competitorId: "c", incomingCount: 40, sweepCap: 1000 })).toBeNull();
    expect(first.updates).toEqual([{ last_sweep_ad_count: 40 }]);

    const next = fakeSupabase({ last_sweep_ad_count: 40 });
    expect(await guardMetaSweepCap(next.client, { competitorId: "c", incomingCount: 40, sweepCap: 1000 })).toBe(1000);
  });

  it("doesn't record capped, empty or uncapped scrapes", async () => {
    for (const params of [
      { incomingCount: 10, sweepCap: 10 },
      { incomingCount: 0, sweepCap: 1000 },
      { incomingCount: 40, sweepCap: null },
    ]) {
      const db = fakeSupabase({ last_sweep_ad_count: 106 });
      expect(await guardMetaSweepCap(db.client, { competitorId: "c", ...params })).toBe(params.sweepCap);
      expect(db.updates).toEqual([]);
    }
  });

  it("passes the cap through before the competitor has a Meta tracking row", async () => {
    const db = fakeSupabase(null);
    expect(await guardMetaSweepCap(db.client, { competitorId: "c", incomingCount: 3, sweepCap: 1000 })).toBe(1000);
    expect(db.updates).toEqual([]);
  });
});
