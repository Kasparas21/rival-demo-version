import { describe, expect, it } from "vitest";

import {
  computeDiscoveryPatternMetrics,
  type PatternMetricsAd,
} from "@/lib/discovery/compute-pattern-metrics";
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

  it("skips unclassified angles in angle_mix", () => {
    const metrics = computeDiscoveryPatternMetrics(
      [
        ad({ id: "a1", ai_extracted_angle: "unclassified" }),
        ad({ id: "a2", ai_extracted_angle: "financing" }),
        ad({ id: "a3", ai_extracted_angle: "financing" }),
      ],
      weekStartMs,
      nowMs,
    );

    expect(metrics.angle_mix).toEqual([{ angle: "financing", count: 2 }]);
  });
});
