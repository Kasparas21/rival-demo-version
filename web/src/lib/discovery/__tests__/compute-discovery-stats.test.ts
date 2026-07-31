import { describe, expect, it } from "vitest";

import {
  computeDiscoveryStats,
  wasRunningInStatsRange,
} from "@/lib/discovery/compute-discovery-stats";
import type { PatternMetricsAd } from "@/lib/discovery/compute-pattern-metrics";
import type { DiscoveryStatsRange } from "@/lib/discovery/discovery-stats-range";

const RANGE: DiscoveryStatsRange = {
  startMs: Date.parse("2026-07-01T00:00:00.000Z"),
  endMs: Date.parse("2026-07-31T23:59:59.999Z"),
  dateFrom: "2026-07-01",
  dateTo: "2026-07-31",
  label: "July 2026",
};

function ad(overrides: Partial<PatternMetricsAd> & Pick<PatternMetricsAd, "id">): PatternMetricsAd {
  return {
    competitor_id: "comp-1",
    competitor_name: "Alpha",
    format: "image",
    ad_text: "Ad copy",
    first_seen_at: "2026-07-10T00:00:00.000Z",
    last_seen_at: "2026-07-30T00:00:00.000Z",
    is_killed: false,
    days_running: 20,
    impressions_index: null,
    is_ultimate_winner: false,
    ai_extracted_angle: null,
    ai_extracted_launch_date: null,
    landing_page_key: null,
    ...overrides,
  };
}

describe("wasRunningInStatsRange", () => {
  it("includes ads still active that launched before the period ends", () => {
    expect(
      wasRunningInStatsRange(
        ad({
          id: "a1",
          first_seen_at: "2026-06-01T00:00:00.000Z",
          is_killed: false,
        }),
        RANGE,
      ),
    ).toBe(true);
  });

  it("excludes ads killed before the period starts", () => {
    expect(
      wasRunningInStatsRange(
        ad({
          id: "a1",
          first_seen_at: "2026-05-01T00:00:00.000Z",
          last_seen_at: "2026-06-15T00:00:00.000Z",
          is_killed: true,
        }),
        RANGE,
      ),
    ).toBe(false);
  });

  it("includes ads killed during the period", () => {
    expect(
      wasRunningInStatsRange(
        ad({
          id: "a1",
          first_seen_at: "2026-06-15T00:00:00.000Z",
          last_seen_at: "2026-07-15T00:00:00.000Z",
          is_killed: true,
        }),
        RANGE,
      ),
    ).toBe(true);
  });
});

describe("computeDiscoveryStats landing pages", () => {
  it("counts unique landing pages only on currently running ads in the period", () => {
    const stats = computeDiscoveryStats(
      [
        ad({
          id: "running-a",
          landing_page_key: "https://offer.example.com/a",
        }),
        ad({
          id: "running-b",
          landing_page_key: "https://offer.example.com/b",
        }),
        ad({
          id: "running-c",
          landing_page_key: "https://offer.example.com/a",
        }),
        ad({
          id: "killed-in-period",
          first_seen_at: "2026-07-05T00:00:00.000Z",
          last_seen_at: "2026-07-20T00:00:00.000Z",
          is_killed: true,
          landing_page_key: "https://offer.example.com/retired",
        }),
        ad({
          id: "ended-before",
          first_seen_at: "2026-05-01T00:00:00.000Z",
          last_seen_at: "2026-06-15T00:00:00.000Z",
          is_killed: true,
          landing_page_key: "https://offer.example.com/old",
        }),
        ad({
          id: "launched-after",
          first_seen_at: "2026-08-01T00:00:00.000Z",
          landing_page_key: "https://offer.example.com/future",
        }),
      ],
      RANGE,
      new Map([["comp-1", { domain: null, logo_url: null }]]),
    );

    expect(stats.market.unique_landing_pages).toBe(2);
    expect(stats.competitors[0]?.unique_landing_pages).toBe(2);
  });
});
