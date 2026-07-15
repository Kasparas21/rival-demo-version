import type { TimelineAd } from "@/components/competitor/tests-timeline/timeline-types";
import {
  buildFrozenCreativeTests,
  buildFrozenDemoAds,
  buildFrozenTimelineAds,
  buildFrozenTimelineDateRange,
} from "@/lib/demo/demo-frozen-ads-payload";
import {
  buildFrozenNikeCreativeTests,
  buildFrozenNikeDemoAds,
  buildFrozenNikeTimelineAds,
  buildFrozenNikeTimelineDateRange,
} from "@/lib/demo/demo-frozen-nike-ads-payload";
import {
  DEMO_COMPETITOR,
  DEMO_OWN_BRAND,
  isDemoOwnBrandDomain,
} from "@/lib/demo/dashboard-demo-config";
import {
  DEMO_ACTIVITY_SCORE,
  DEMO_LANDING_PAGES,
  DEMO_PLATFORM_ACTIVE_COUNTS,
  DEMO_PLATFORM_TOTAL_COUNTS,
  DEMO_SAVED_AD,
  DEMO_STRATEGY_CHANNEL_SIGNALS,
  DEMO_STRATEGY_JOURNEY_GOAL,
  DEMO_STRATEGY_MAP,
  type DemoAd,
  type DemoCreativeTest,
  type DemoPlatform,
} from "@/lib/demo/dashboard-demo-data";
import {
  OWN_ACTIVITY_SCORE,
  OWN_DEFAULT_VISIBLE_PLATFORMS,
  OWN_LANDING_PAGES,
  OWN_PLATFORM_ACTIVE_COUNTS,
  OWN_PLATFORM_TOTAL_COUNTS,
  OWN_SAVED_AD,
  OWN_STRATEGY_CHANNEL_SIGNALS,
  OWN_STRATEGY_JOURNEY_GOAL,
  OWN_STRATEGY_MAP,
} from "@/lib/demo/demo-own-brand-data";
import type {
  StrategyChannelSignals,
  StrategyJourneyGoal,
  StrategyMapPayload,
} from "@/lib/strategy-overview/payload-types";

export type DemoBrandKey = "competitor" | "own";

export type DemoActivityScoreSnapshot = {
  score: number;
  tier: number;
  tierLabel: string;
  spend: string;
  confidence: string;
  topPercent: string;
  reasons: readonly string[];
};

export type DemoSavedAdSnapshot = {
  id: string;
  title: string;
  body: string;
  savedAt: string;
  gradient: string;
};

export type DemoBrandPayload = {
  key: DemoBrandKey;
  name: string;
  domain: string;
  lastScraped: string;
  lastSpyRun?: string;
  platformActiveCounts: Record<DemoPlatform, number>;
  platformTotalCounts: Record<DemoPlatform, number>;
  activityScore: DemoActivityScoreSnapshot;
  landingPages: readonly {
    id: string;
    url: string;
    ads: number;
    platforms: Record<string, number>;
  }[];
  ads: DemoAd[];
  savedAd: DemoSavedAdSnapshot;
  strategyMap: StrategyMapPayload;
  strategyChannelSignals: StrategyChannelSignals;
  strategyJourneyGoal: StrategyJourneyGoal;
  timelineAds: TimelineAd[];
  timelineDateRange: { earliest: string; latest: string };
  creativeTests: DemoCreativeTest[];
  defaultVisiblePlatforms: DemoPlatform[];
};

const COMPETITOR_PAYLOAD: DemoBrandPayload = {
  key: "competitor",
  name: DEMO_COMPETITOR.name,
  domain: DEMO_COMPETITOR.domain,
  lastScraped: DEMO_COMPETITOR.lastScraped,
  lastSpyRun: DEMO_COMPETITOR.lastSpyRun,
  platformActiveCounts: DEMO_PLATFORM_ACTIVE_COUNTS,
  platformTotalCounts: DEMO_PLATFORM_TOTAL_COUNTS,
  activityScore: DEMO_ACTIVITY_SCORE,
  landingPages: DEMO_LANDING_PAGES,
  ads: buildFrozenDemoAds(DEMO_COMPETITOR.domain),
  savedAd: DEMO_SAVED_AD,
  strategyMap: DEMO_STRATEGY_MAP,
  strategyChannelSignals: DEMO_STRATEGY_CHANNEL_SIGNALS,
  strategyJourneyGoal: DEMO_STRATEGY_JOURNEY_GOAL,
  timelineAds: buildFrozenTimelineAds(),
  timelineDateRange: buildFrozenTimelineDateRange(),
  creativeTests: buildFrozenCreativeTests(),
  defaultVisiblePlatforms: ["meta", "google", "pinterest", "snapchat", "tiktok"],
};

const OWN_PAYLOAD: DemoBrandPayload = {
  key: "own",
  name: DEMO_OWN_BRAND.name,
  domain: DEMO_OWN_BRAND.domain,
  lastScraped: DEMO_OWN_BRAND.lastScraped,
  platformActiveCounts: OWN_PLATFORM_ACTIVE_COUNTS,
  platformTotalCounts: OWN_PLATFORM_TOTAL_COUNTS,
  activityScore: OWN_ACTIVITY_SCORE,
  landingPages: OWN_LANDING_PAGES,
  ads: buildFrozenNikeDemoAds(DEMO_OWN_BRAND.domain),
  savedAd: OWN_SAVED_AD,
  strategyMap: OWN_STRATEGY_MAP,
  strategyChannelSignals: OWN_STRATEGY_CHANNEL_SIGNALS,
  strategyJourneyGoal: OWN_STRATEGY_JOURNEY_GOAL,
  timelineAds: buildFrozenNikeTimelineAds(),
  timelineDateRange: buildFrozenNikeTimelineDateRange(),
  creativeTests: buildFrozenNikeCreativeTests(),
  defaultVisiblePlatforms: OWN_DEFAULT_VISIBLE_PLATFORMS,
};

export function resolveDemoBrandKey(domain: string): DemoBrandKey {
  return isDemoOwnBrandDomain(domain) ? "own" : "competitor";
}

export function getDemoBrandPayload(domain?: string): DemoBrandPayload {
  if (domain && isDemoOwnBrandDomain(domain)) return OWN_PAYLOAD;
  return COMPETITOR_PAYLOAD;
}

export function listDemoBrandPayloads(): DemoBrandPayload[] {
  return [COMPETITOR_PAYLOAD, OWN_PAYLOAD];
}
