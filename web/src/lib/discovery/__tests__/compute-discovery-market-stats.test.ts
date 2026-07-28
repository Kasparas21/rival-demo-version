import { describe, expect, it } from "vitest";

import { computeDiscoveryMarketStats } from "@/lib/discovery/compute-discovery-market-stats";
import type { DiscoveryMarketStatsAd } from "@/lib/discovery/compute-discovery-market-stats";

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);

function ad(partial: Partial<DiscoveryMarketStatsAd> & Pick<DiscoveryMarketStatsAd, "first_seen_at">): DiscoveryMarketStatsAd {
  return {
    competitor_id: partial.competitor_id ?? "c1",
    competitor_name: partial.competitor_name ?? "Brand A",
    format: partial.format ?? "image",
    last_seen_at: partial.last_seen_at ?? partial.first_seen_at,
    is_killed: partial.is_killed ?? false,
    impressions_index: partial.impressions_index ?? null,
    is_ultimate_winner: partial.is_ultimate_winner ?? false,
    ...partial,
  };
}

describe("computeDiscoveryMarketStats", () => {
  it("returns empty stats for no ads", () => {
    const stats = computeDiscoveryMarketStats([], NOW);
    expect(stats.total_ads).toBe(0);
    expect(stats.new_this_week).toBe(0);
  });

  it("counts launches and week-over-week change", () => {
    const stats = computeDiscoveryMarketStats(
      [
        ad({ first_seen_at: new Date(NOW - 2 * 86_400_000).toISOString() }),
        ad({ first_seen_at: new Date(NOW - 3 * 86_400_000).toISOString() }),
        ad({ first_seen_at: new Date(NOW - 10 * 86_400_000).toISOString() }),
        ad({
          first_seen_at: new Date(NOW - 80 * 86_400_000).toISOString(),
          is_killed: true,
          last_seen_at: new Date(NOW - 1 * 86_400_000).toISOString(),
        }),
      ],
      NOW,
    );

    expect(stats.total_ads).toBe(4);
    expect(stats.new_this_week).toBe(2);
    expect(stats.new_last_week).toBe(1);
    expect(stats.new_week_over_week_delta).toBe(1);
    expect(stats.retired_this_week).toBe(1);
    expect(stats.net_change_this_week).toBe(1);
  });

  it("picks top competitor and hottest launcher", () => {
    const stats = computeDiscoveryMarketStats(
      [
        ad({
          competitor_id: "a",
          competitor_name: "Alpha",
          first_seen_at: new Date(NOW - 1 * 86_400_000).toISOString(),
        }),
        ad({
          competitor_id: "a",
          competitor_name: "Alpha",
          first_seen_at: new Date(NOW - 2 * 86_400_000).toISOString(),
        }),
        ad({
          competitor_id: "b",
          competitor_name: "Beta",
          first_seen_at: new Date(NOW - 1 * 86_400_000).toISOString(),
        }),
        ad({
          competitor_id: "b",
          competitor_name: "Beta",
          first_seen_at: new Date(NOW - 100 * 86_400_000).toISOString(),
        }),
      ],
      NOW,
    );

    expect(stats.top_competitor_name).toBe("Alpha");
    expect(stats.top_competitor_ad_count).toBe(2);
    expect(stats.hottest_competitor_name).toBe("Alpha");
    expect(stats.hottest_competitor_new_this_week).toBe(2);
  });
});
