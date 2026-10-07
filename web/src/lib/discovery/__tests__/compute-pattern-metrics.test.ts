import { describe, expect, it } from "vitest";

import {
  computeDiscoveryPatternMetrics,
  weekCoverage,
  type PatternMetricsAd,
} from "@/lib/discovery/compute-pattern-metrics";
import { weekComparisonForPrompt } from "@/lib/discovery/generate-pattern-report";
import { parseUtcWeekStartYmd } from "@/lib/discovery/pattern-week-utils";

const WEEK_START = "2026-07-27";
const weekStartMs = parseUtcWeekStartYmd(WEEK_START);
const nowMs = weekStartMs + 3 * 86_400_000;

function ad(overrides: Partial<PatternMetricsAd> & Pick<PatternMetricsAd, "id">): PatternMetricsAd {
  return {
    competitor_id: "comp-1",
    competitor_name: "Alpha Dental",
    format: "image",
    ad_text: "Free consultation",
    first_seen_at: "2026-07-28T10:00:00.000Z",
    last_seen_at: "2026-07-30T10:00:00.000Z",
    is_killed: false,
    days_running: 5,
    impressions_index: 2,
    is_ultimate_winner: false,
    ai_extracted_angle: "free consult",
    ai_extracted_launch_date: null,
    landing_page_key: null,
    ...overrides,
  };
}

describe("computeDiscoveryPatternMetrics", () => {
  it("returns empty metrics for no ads", () => {
    const metrics = computeDiscoveryPatternMetrics([], weekStartMs, nowMs);
    expect(metrics.total_ads).toBe(0);
    expect(metrics.weekly_series).toHaveLength(8);
  });

  it("counts launches and kills in the correct week windows", () => {
    const metrics = computeDiscoveryPatternMetrics(
      [
        ad({ id: "new-1", first_seen_at: "2026-07-28T10:00:00.000Z" }),
        ad({
          id: "prev-new",
          first_seen_at: "2026-07-21T10:00:00.000Z",
          ai_extracted_launch_date: "2026-07-21",
        }),
        ad({
          id: "killed-1",
          is_killed: true,
          first_seen_at: "2026-07-10T10:00:00.000Z",
          last_seen_at: "2026-07-29T10:00:00.000Z",
          days_running: 4,
        }),
        ad({
          id: "killed-prev",
          is_killed: true,
          first_seen_at: "2026-07-10T10:00:00.000Z",
          last_seen_at: "2026-07-22T10:00:00.000Z",
          days_running: 12,
        }),
      ],
      weekStartMs,
      nowMs,
    );

    expect(metrics.new_this_week).toBe(1);
    expect(metrics.new_prev_week).toBe(1);
    expect(metrics.killed_this_week).toBe(1);
    expect(metrics.killed_prev_week).toBe(1);
    expect(metrics.net_change).toBe(0);
  });

  it("counts fast kills within 7 days", () => {
    const metrics = computeDiscoveryPatternMetrics(
      [
        ad({
          id: "fast",
          is_killed: true,
          last_seen_at: "2026-07-29T10:00:00.000Z",
          days_running: 3,
        }),
        ad({
          id: "slow",
          is_killed: true,
          last_seen_at: "2026-07-29T10:00:00.000Z",
          days_running: 20,
        }),
      ],
      weekStartMs,
      nowMs,
    );

    expect(metrics.fast_kills_this_week).toBe(1);
    expect(metrics.median_run_days_of_killed).toBe(11.5);
  });

  it("computes video share of active and new ads", () => {
    const metrics = computeDiscoveryPatternMetrics(
      [
        ad({ id: "v1", format: "video", first_seen_at: "2026-07-28T10:00:00.000Z" }),
        ad({ id: "i1", format: "image", first_seen_at: "2026-07-28T10:00:00.000Z" }),
        ad({ id: "i2", format: "image", first_seen_at: "2026-06-01T10:00:00.000Z" }),
      ],
      weekStartMs,
      nowMs,
    );

    expect(metrics.video_share_pct).toBe(33);
    expect(metrics.video_share_of_new_pct).toBe(50);
  });

  it("orders weekly series oldest to newest with 8 points", () => {
    const metrics = computeDiscoveryPatternMetrics(
      [ad({ id: "a1", first_seen_at: "2026-06-01T10:00:00.000Z" })],
      weekStartMs,
      nowMs,
    );

    expect(metrics.weekly_series).toHaveLength(8);
    expect(metrics.weekly_series[0]!.week_start < metrics.weekly_series[7]!.week_start).toBe(true);
    expect(metrics.weekly_series[7]!.week_start).toBe(WEEK_START);
  });

  it("groups angle_mix by category and skips unclassified ads", () => {
    const metrics = computeDiscoveryPatternMetrics(
      [
        ad({ id: "a1", ai_extracted_angle: "unclassified" }),
        ad({ id: "a2", ai_extracted_angle: "price · Hook: Implants from €999 · Body: Price-led offer" }),
        ad({ id: "a3", ai_extracted_angle: "price · Hook: Fixed price aligners · Body: Transparent pricing" }),
        ad({ id: "a4", ai_extracted_angle: "financing · Hook: Pay monthly" }),
      ],
      weekStartMs,
      nowMs,
    );

    expect(metrics.angle_mix.map((a) => [a.angle, a.ad_ids])).toEqual([
      ["Price", ["a2", "a3"]],
      ["Other", ["a4"]],
    ]);
    expect(metrics.angle_mix[0]).toMatchObject({ count: 2, active_count: 2, new_this_week: 2 });
  });

  describe("mid-week reports", () => {
    // nowMs is Thursday 00:00: Monday–Wednesday of the week have happened.
    const ads = [
      ad({ id: "this-mon", first_seen_at: "2026-07-27T09:00:00.000Z" }),
      ad({ id: "prev-tue", first_seen_at: "2026-07-21T10:00:00.000Z" }),
      ad({ id: "prev-fri", first_seen_at: "2026-07-24T10:00:00.000Z" }),
      ad({ id: "prev-sun", first_seen_at: "2026-07-26T10:00:00.000Z" }),
      ad({
        id: "killed-prev-wed",
        is_killed: true,
        first_seen_at: "2026-07-01T10:00:00.000Z",
        last_seen_at: "2026-07-22T10:00:00.000Z",
      }),
      ad({
        id: "killed-prev-sat",
        is_killed: true,
        first_seen_at: "2026-07-01T10:00:00.000Z",
        last_seen_at: "2026-07-25T10:00:00.000Z",
      }),
    ];

    it("compares the days so far with the same days of the previous week", () => {
      const metrics = computeDiscoveryPatternMetrics(ads, weekStartMs, nowMs);
      expect(metrics.days_covered).toBe(3);
      expect(metrics.new_this_week).toBe(1);
      expect(metrics.new_prev_week).toBe(3);
      expect(metrics.killed_prev_week).toBe(2);
      expect(metrics.prev_week_same_days).toEqual({ new: 1, killed: 1, net_change: 0, new_ultimate_winners: 0 });
      expect(metrics.competitors[0]).toMatchObject({ launched_prev_same_days: 1, killed_prev_same_days: 1 });
    });

    it("uses the whole previous week once the week is over", () => {
      const metrics = computeDiscoveryPatternMetrics(ads, weekStartMs, weekStartMs + 9 * 86_400_000);
      expect(metrics.days_covered).toBe(7);
      expect(metrics.prev_week_same_days).toMatchObject({ new: 3, killed: 2 });
    });

    it("counts a report made early on Monday as day 1", () => {
      expect(weekCoverage(weekStartMs, weekStartMs + 3_600_000).daysCovered).toBe(1);
      expect(weekCoverage(weekStartMs, weekStartMs).daysCovered).toBe(1);
    });

    it("hands the model the computed change and the dates it covers", () => {
      const metrics = computeDiscoveryPatternMetrics(ads, weekStartMs, nowMs);
      const week = weekComparisonForPrompt(metrics, weekStartMs, nowMs);
      expect(week).toMatchObject({
        this_week: "2026-07-27 to 2026-07-29",
        days_covered: 3,
        week_complete: false,
        new_launches: { this_week: 1, previous_week_same_days: 1, change: 0, direction: "flat" },
        retired: { this_week: 0, previous_week_same_days: 1, change: -1, direction: "down" },
      });
      expect(week.compared_with).toContain("2026-07-20 to 2026-07-22");
    });
  });
});
