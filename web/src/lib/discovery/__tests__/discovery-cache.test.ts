import { describe, expect, it } from "vitest";

import {
  discoveryFeedCacheKey,
  sanitizeDiscoveryAds,
  serializeDiscoveryQuery,
  validateDiscoveryFeedCache,
} from "@/lib/discovery/discovery-cache";
import { DEFAULT_DISCOVERY_TOOLBAR } from "@/components/discovery/discovery-types";
import type { DiscoveryAdDto } from "@/lib/discovery/types";

describe("discovery-cache", () => {
  it("builds stable cache keys for the same query", () => {
    const keyA = discoveryFeedCacheKey("brand-1", DEFAULT_DISCOVERY_TOOLBAR, "", "seed-a", "2026-07-27");
    const keyB = discoveryFeedCacheKey("brand-1", DEFAULT_DISCOVERY_TOOLBAR, "", "seed-a", "2026-07-27");
    expect(keyA).toBe(keyB);
    expect(keyA).toContain("brand-1:discovery:v5:2026-07-27:");
  });

  it("changes cache key when client selection changes", () => {
    const active = discoveryFeedCacheKey("brand-1", DEFAULT_DISCOVERY_TOOLBAR, "", "seed-a");
    const multi = discoveryFeedCacheKey(
      "brand-1",
      { ...DEFAULT_DISCOVERY_TOOLBAR, selectedClientBrandIds: new Set(["brand-1", "brand-2"]) },
      "",
      "seed-a",
    );
    expect(active).not.toBe(multi);
  });

  it("changes cache key when shuffle seed changes", () => {
    const toolbar = DEFAULT_DISCOVERY_TOOLBAR;
    const a = discoveryFeedCacheKey("brand-1", toolbar, "", "seed-a");
    const b = discoveryFeedCacheKey("brand-1", toolbar, "", "seed-b");
    expect(a).not.toBe(b);
  });

  it("rejects invalid cached ads", () => {
    expect(
      validateDiscoveryFeedCache({
        ads: [{ id: "ad-1" } as DiscoveryAdDto, null as unknown as DiscoveryAdDto],
        total: 1,
        has_more: false,
        competitors: [],
        platform_counts: {},
        market_stats: {
          total_ads: 1,
          active_ads: 1,
          retired_ads: 0,
          competitors_tracked: 1,
          new_this_week: 0,
          new_last_week: 0,
          new_week_over_week_delta: 0,
          new_week_over_week_pct: null,
          retired_this_week: 0,
          net_change_this_week: 0,
          ultimate_winners: 0,
          video_percent: 0,
          top_competitor_name: null,
          top_competitor_ad_count: 0,
          avg_impressions_index: null,
          hottest_competitor_name: null,
          hottest_competitor_new_this_week: 0,
        },
        shuffle_seed: "seed",
        offset: 1,
      }),
    ).toBe(false);
  });

  it("sanitizes null ad rows", () => {
    const ads = sanitizeDiscoveryAds([
      { id: "ad-1" } as DiscoveryAdDto,
      null as unknown as DiscoveryAdDto,
    ]);
    expect(ads).toHaveLength(1);
    expect(ads[0]?.id).toBe("ad-1");
  });

  it("serializes toolbar filters deterministically", () => {
    const toolbar = {
      ...DEFAULT_DISCOVERY_TOOLBAR,
      selectedPlatforms: new Set(["meta", "google"]),
      ultimateOnly: true,
    };
    expect(serializeDiscoveryQuery(toolbar, "Sale", "seed")).toContain("google,meta");
    expect(serializeDiscoveryQuery(toolbar, "Sale", "seed")).toContain("sale");
  });
});
