import { describe, expect, it } from "vitest";

import {
  computeUltimateWinnerScore,
  extractImpressionsIndex,
  passesUltimateWinnersFeedFilter,
  qualifiesAsUltimateWinner,
  resolveScrapedAdRunDays,
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
  it("qualifies high band + moderate runtime", () => {
    expect(qualifiesAsUltimateWinner(4, 60)).toBe(true);
    expect(qualifiesAsUltimateWinner(4, 14)).toBe(true);
  });

  it("qualifies mid band + three-week runtime (SMB-friendly)", () => {
    expect(qualifiesAsUltimateWinner(2, 21)).toBe(true);
    expect(qualifiesAsUltimateWinner(2, 20)).toBe(false);
  });

  it("rejects short tests even with a high band", () => {
    expect(qualifiesAsUltimateWinner(4, 10)).toBe(false);
  });

  it("falls back to long runtime when Meta omits impression band", () => {
    expect(qualifiesAsUltimateWinner(null, 90)).toBe(true);
    expect(qualifiesAsUltimateWinner(null, 42)).toBe(true);
    expect(qualifiesAsUltimateWinner(null, 30)).toBe(false);
  });
});

describe("computeUltimateWinnerScore", () => {
  it("rewards longer runtime at the same impression band", () => {
    const short = computeUltimateWinnerScore(4, 14);
    const long = computeUltimateWinnerScore(4, 90);
    expect(long).toBeGreaterThan(short);
  });

  it("scores long-runtime ads without impression band", () => {
    expect(computeUltimateWinnerScore(null, 120)).toBeGreaterThan(0);
    expect(computeUltimateWinnerScore(null, 14)).toBe(0);
  });
});

describe("resolveScrapedAdRunDays", () => {
  it("uses Meta payload runtime when DB first_seen is newer than launch", () => {
    const nowMs = Date.UTC(2026, 6, 1);
    const startedAt = Math.floor(Date.UTC(2024, 0, 1) / 1000);
    const days = resolveScrapedAdRunDays({
      platform: "meta",
      first_seen_at: "2026-05-01T00:00:00.000Z",
      last_seen_at: "2026-06-01T00:00:00.000Z",
      is_killed: false,
      raw_payload: {
        startedAt,
        isActive: true,
      },
      nowMs,
    });
    expect(days).toBeGreaterThan(500);
  });
});

describe("passesUltimateWinnersFeedFilter", () => {
  it("includes strict winners and scored long-runners", () => {
    expect(passesUltimateWinnersFeedFilter(2, 30)).toBe(true);
    expect(passesUltimateWinnersFeedFilter(null, 90)).toBe(true);
    expect(passesUltimateWinnersFeedFilter(null, 10)).toBe(false);
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
