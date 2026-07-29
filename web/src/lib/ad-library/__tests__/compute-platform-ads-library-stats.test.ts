import { describe, expect, it } from "vitest";

import { computePlatformAdsLibraryStats } from "@/lib/ad-library/compute-platform-ads-library-stats";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

const NOW = Date.parse("2026-07-29T12:00:00.000Z");

function metaAd(partial: Partial<MetaAdCard> & Pick<MetaAdCard, "id">): MetaAdCard {
  return {
    id: partial.id,
    headline: partial.headline ?? "Headline",
    desc: partial.desc ?? "Body",
    cta: partial.cta ?? "Learn more",
    subtext: partial.subtext ?? "example.com",
    img: partial.img ?? "https://example.com/img.jpg",
    isVideo: partial.isVideo ?? false,
    adLibraryUrl: partial.adLibraryUrl ?? "https://facebook.com/ads/library/?id=1",
    pageName: partial.pageName ?? "Brand",
    startedAt: partial.startedAt,
    endedAt: partial.endedAt,
    isActive: partial.isActive,
    impressionsIndex: partial.impressionsIndex,
  };
}

describe("computePlatformAdsLibraryStats", () => {
  it("returns empty stats for no ads", () => {
    const stats = computePlatformAdsLibraryStats("meta", [], null, NOW);
    expect(stats.total_ads).toBe(0);
    expect(stats.new_this_week).toBe(0);
  });

  it("counts active, video share, and week-over-week launches", () => {
    const weekAgo = NOW - 8 * 86_400_000;
    const threeDaysAgo = NOW - 3 * 86_400_000;
    const ads = [
      metaAd({
        id: "a1",
        isVideo: true,
        isActive: true,
        startedAt: Math.floor(threeDaysAgo / 1000),
        impressionsIndex: 3,
      }),
      metaAd({
        id: "a2",
        isVideo: false,
        isActive: true,
        startedAt: Math.floor(weekAgo / 1000),
        impressionsIndex: 2,
      }),
      metaAd({
        id: "a3",
        isVideo: false,
        isActive: false,
        endedAt: Math.floor(threeDaysAgo / 1000),
        startedAt: Math.floor((NOW - 40 * 86_400_000) / 1000),
      }),
    ];

    const stats = computePlatformAdsLibraryStats("meta", ads, NOW, NOW);
    expect(stats.total_ads).toBe(3);
    expect(stats.active_ads).toBe(2);
    expect(stats.retired_ads).toBe(1);
    expect(stats.new_this_week).toBe(1);
    expect(stats.new_last_week).toBe(1);
    expect(stats.new_week_over_week_delta).toBe(0);
    expect(stats.video_percent).toBe(33);
    expect(stats.impressions_coverage_percent).toBe(67);
  });
});
