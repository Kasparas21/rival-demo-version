import { describe, expect, it } from "vitest";

import {
  computeUltimateWinnerScore,
  extractImpressionsIndex,
  qualifiesAsUltimateWinner,
  sortAdsByPerformanceSort,
} from "@/lib/ad-library/ad-performance-ranking";

describe("extractImpressionsIndex", () => {
  it("reads impressionsIndex from normalized payload", () => {
    expect(extractImpressionsIndex({ impressionsIndex: 4 })).toBe(4);
  });

  it("reads nested impressions_with_index", () => {
    expect(
      extractImpressionsIndex({ impressions_with_index: { impressions_index: 5 } }),
    ).toBe(5);
  });
});

describe("qualifiesAsUltimateWinner", () => {
  it("requires both high impressions band and long runtime", () => {
    expect(qualifiesAsUltimateWinner(4, 60)).toBe(true);
    expect(qualifiesAsUltimateWinner(2, 60)).toBe(false);
    expect(qualifiesAsUltimateWinner(4, 10)).toBe(false);
    expect(qualifiesAsUltimateWinner(null, 90)).toBe(false);
  });
});

describe("computeUltimateWinnerScore", () => {
  it("rewards longer runtime at the same impression band", () => {
    const short = computeUltimateWinnerScore(4, 14);
    const long = computeUltimateWinnerScore(4, 90);
    expect(long).toBeGreaterThan(short);
  });

  it("returns 0 without impressions index", () => {
    expect(computeUltimateWinnerScore(null, 120)).toBe(0);
  });
});

describe("sortAdsByPerformanceSort", () => {
  const rows = [
    { id: "a", first_seen_at: "2026-01-01T00:00:00Z", last_seen_at: "2026-02-01T00:00:00Z", imp: 2 },
    { id: "b", first_seen_at: "2026-03-01T00:00:00Z", last_seen_at: "2026-06-01T00:00:00Z", imp: 5 },
    { id: "c", first_seen_at: "2026-02-01T00:00:00Z", last_seen_at: "2026-05-01T00:00:00Z", imp: 4 },
  ];

  const opts = {
    impressionsIndexFor: (r: (typeof rows)[0]) => r.imp,
    daysRunningFor: (r: (typeof rows)[0]) =>
      Math.floor(
        (new Date(r.last_seen_at).getTime() - new Date(r.first_seen_at).getTime()) / 86_400_000,
      ),
  };

  it("sorts by impressions descending", () => {
    const sorted = sortAdsByPerformanceSort(rows, "impressions", opts);
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by ultimate_winner score", () => {
    const sorted = sortAdsByPerformanceSort(rows, "ultimate_winner", opts);
    expect(sorted[0]?.id).toBe("b");
  });
});
