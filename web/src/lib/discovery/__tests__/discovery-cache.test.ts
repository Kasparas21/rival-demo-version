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
    expect(keyA).toContain("brand-1:discovery:v2:2026-07-27:");
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
