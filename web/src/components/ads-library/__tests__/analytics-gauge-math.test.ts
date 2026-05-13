import { describe, expect, it } from "vitest";

import { allocateGaugeSegmentSweeps } from "@/lib/charts/gauge-segments";

const ORDER = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"] as const;

describe("allocateGaugeSegmentSweeps", () => {
  it("splits sweep evenly for 50/50 two-platform mix", () => {
    const counts = { meta: 5, google: 5, tiktok: 0, linkedin: 0, pinterest: 0, snapchat: 0 };
    const rows = allocateGaugeSegmentSweeps(counts, 10, ORDER, 270, 3, 1);
    expect(rows).toHaveLength(2);
    expect(rows[0].sweepDeg).toBeCloseTo(rows[1].sweepDeg, 5);
    expect(rows.reduce((s, r) => s + r.sweepDeg, 0)).toBeCloseTo(270 - 3, 5);
  });

  it("only includes platforms with count > 0", () => {
    const counts = { meta: 3, google: 0, tiktok: 0, linkedin: 0, pinterest: 0, snapchat: 0 };
    const rows = allocateGaugeSegmentSweeps(counts, 3, ORDER, 270, 3, 0);
    expect(rows).toEqual([{ platform: "meta", count: 3, sweepDeg: 270 }]);
  });
});
