import type { TimelineAd } from "@/components/competitor/tests-timeline/timeline-types";

import type { DemoAd, DemoCreativeTest } from "@/lib/demo/dashboard-demo-data";
import { frozenAdToDemoAd } from "@/lib/demo/demo-frozen-ads-payload";
import {
  FROZEN_AD_BY_ID,
  FROZEN_ADS_BRAND_NAME,
  FROZEN_CREATIVE_TESTS,
  FROZEN_LIBRARY_AD_IDS,
  FROZEN_TIMELINE_ADS,
} from "@/lib/demo/frozen/frozen-nike-com-ads";

export { FROZEN_ADS_BRAND_NAME };

export function buildFrozenNikeDemoAds(domain = "your-brand.com"): DemoAd[] {
  return FROZEN_LIBRARY_AD_IDS.map((id) => {
    const ad = FROZEN_AD_BY_ID[id];
    if (!ad) throw new Error(`Missing frozen Nike ad: ${id}`);
    return frozenAdToDemoAd(ad, domain, FROZEN_ADS_BRAND_NAME);
  });
}

export function buildFrozenNikeTimelineAds(): TimelineAd[] {
  return FROZEN_TIMELINE_ADS;
}

export function buildFrozenNikeTimelineDateRange(): { earliest: string; latest: string } {
  const times = FROZEN_TIMELINE_ADS.flatMap((ad) => [
    Date.parse(ad.first_seen_at),
    Date.parse(ad.last_seen_at),
  ]).filter(Number.isFinite);
  if (!times.length) {
    return { earliest: "2026-06-01T00:00:00.000Z", latest: "2026-07-15T00:00:00.000Z" };
  }
  return {
    earliest: new Date(Math.min(...times)).toISOString(),
    latest: new Date(Math.max(...times)).toISOString(),
  };
}

export function buildFrozenNikeCreativeTests(): DemoCreativeTest[] {
  return FROZEN_CREATIVE_TESTS;
}

export function getFrozenNikeCreativeUrl(adId: string): string | null {
  return FROZEN_AD_BY_ID[adId]?.frozen_creative_url ?? null;
}
