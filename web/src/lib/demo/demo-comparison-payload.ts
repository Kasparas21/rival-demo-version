import type {
  AnglesByPlatformInsight,
  CompetitorStrategyOverviewPayload,
  SpendTrendByPlatformInsight,
  StrategyPlatform,
  TestingVelocityByPlatformInsight,
} from "@/lib/strategy-overview/payload-types";

function angle(
  label: string,
  totalCount: number,
  platform: StrategyPlatform,
  avgLifespanDays: number,
): AnglesByPlatformInsight {
  return {
    angle: label,
    totalCount,
    platforms: [platform],
    platformCounts: { [platform]: totalCount },
    avgLifespanDays,
  };
}

function trend(platform: StrategyPlatform, weekBuckets: number[]): SpendTrendByPlatformInsight {
  const first = weekBuckets[0] ?? 0;
  const last = weekBuckets[weekBuckets.length - 1] ?? 0;
  const pctChange = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const direction = pctChange > 8 ? "up" : pctChange < -8 ? "down" : "flat";
  return { platform, weekBuckets, direction, pctChange };
}

function velocity(
  platform: StrategyPlatform,
  testRate: number,
  avgLifespanDays: number,
  newIn30 = Math.round(testRate * 40),
  totalActive = 40,
): TestingVelocityByPlatformInsight {
  return { platform, testRate, avgLifespanDays, newIn30, totalActive };
}

function minimalPayload(
  angles: AnglesByPlatformInsight[],
  testing: TestingVelocityByPlatformInsight[],
  spendTrend: SpendTrendByPlatformInsight[],
): CompetitorStrategyOverviewPayload {
  return {
    version: 1,
    sourceScrapeBatchId: "demo",
    map: {
      title: "Demo",
      competitor: { name: "Demo", domain: "demo.com", logoUrl: null },
      totalAdSpend: { value: 0, currency: "EUR", unit: "month", confidence: "low" },
      spendVsSimilar: "Low",
      spendTrendline: [],
      audienceSignals: { interests: [], ageRange: "", geo: "", targetingType: [] },
      dominantFormat: { format: "video", percentage: 50 },
      toneOfVoice: { primary: "", attributes: [] },
      topAngles: [],
      platformNodes: [],
      funnelEdges: [],
      activeAdCount: 0,
      platformCount: 0,
    },
    insights: {
      platform_footprint: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        platforms: [],
        totalActiveAds: 0,
        totalEstSpendEur: 0,
        platformCount: 0,
      },
      budget_allocation: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        segments: [],
        totalEstSpendEur: 0,
        insight: "",
      },
      library_activity_timeline: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        months: [],
        dataQuality: { realLaunchPct: 0, qualityLabel: "low", warning: null },
      },
      funnel_distribution: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        stages: [],
        totalClassified: 0,
        totalAds: 0,
        insufficientData: true,
      },
      angle_clustering: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        angles: [],
        unclassifiedPct: 0,
        insufficientData: true,
      },
      voice_tone_position: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        competitor: null,
        userBrand: null,
        sampleSize: 0,
      },
      ad_format_mix: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        formats: [],
      },
      angles_by_platform: angles,
      testing_velocity_by_platform: testing,
      spend_trend_by_platform: spendTrend,
    },
  };
}

export function buildDemoWorkspaceComparisonPayload(workspaceName: string): CompetitorStrategyOverviewPayload {
  const angles: AnglesByPlatformInsight[] = [
    angle(`brand awareness · ${workspaceName}`, 35, "google", 264),
    angle(`identity · ${workspaceName}`, 25, "google", 637),
    angle(`brand awareness · Hook: flagship store · ${workspaceName}`, 21, "google", 1590),
    angle(`brand awareness · Hook: seasonal drop · ${workspaceName}`, 20, "google", 109),
    angle(`product push · Hook: new arrivals · ${workspaceName}`, 18, "meta", 74),
    angle(`social proof · Hook: athlete reviews · ${workspaceName}`, 16, "meta", 52),
    angle(`membership · Hook: loyalty perks · ${workspaceName}`, 14, "google", 198),
    angle(`comparison · Hook: vs alternatives · ${workspaceName}`, 12, "google", 311),
    angle(`discount urgency · Hook: limited time · ${workspaceName}`, 11, "meta", 28),
    angle(`retargeting · Hook: cart reminder · ${workspaceName}`, 10, "meta", 45),
    angle(`brand story · Hook: heritage film · ${workspaceName}`, 9, "meta", 420),
    angle(`local inventory · Hook: store pickup · ${workspaceName}`, 8, "google", 156),
    angle(`UGC testimonial · Hook: customer clip · ${workspaceName}`, 7, "tiktok", 19),
    angle(`seasonal sale · Hook: spring edit · ${workspaceName}`, 6, "pinterest", 33),
    angle(`influencer collab · Hook: creator fit · ${workspaceName}`, 5, "meta", 41),
    angle(`sustainability · Hook: recycled line · ${workspaceName}`, 4, "meta", 88),
    angle(`shared · seasonal drop`, 3, "google", 62),
  ];

  const testing: TestingVelocityByPlatformInsight[] = [
    velocity("google", 0.01, 578, 1, 86),
    velocity("meta", 0.24, 36, 18, 75),
    velocity("tiktok", 0.79, 38, 22, 28),
    velocity("pinterest", 0.08, 44, 2, 24),
    velocity("linkedin", 0, 0, 0, 0),
    velocity("snapchat", 0, 0, 0, 0),
  ];

  const spendTrend: SpendTrendByPlatformInsight[] = [
    trend("google", [42, 38, 34, 30, 26, 22, 18]),
    trend("meta", [12, 18, 22, 28, 24, 20, 16]),
    trend("tiktok", [8, 12, 16, 22, 28, 34, 40]),
    trend("pinterest", [10, 11, 9, 10, 11, 10, 9]),
  ];

  return minimalPayload(angles, testing, spendTrend);
}

export function buildDemoCompetitorComparisonPayload(competitorName: string): CompetitorStrategyOverviewPayload {
  const angles: AnglesByPlatformInsight[] = [
    angle(`Brand mention only · ${competitorName}`, 30, "tiktok", 20),
    angle(`brand awareness video · Hook: ${competitorName} · Body: short-form`, 24, "tiktok", 21),
    angle(`creator duet · Hook: try-on · ${competitorName}`, 19, "tiktok", 17),
    angle(`Snapchat product demo · Hook: youth edit · ${competitorName}`, 17, "snapchat", 16),
    angle(`search capture · Hook: brand terms · ${competitorName}`, 15, "google", 88),
    angle(`outlet promo · Hook: extra 20% · ${competitorName}`, 13, "meta", 26),
    angle(`running club · Hook: community · ${competitorName}`, 11, "meta", 34),
    angle(`shared · seasonal drop`, 8, "google", 41),
  ];

  const testing: TestingVelocityByPlatformInsight[] = [
    velocity("google", 0.21, 88, 14, 68),
    velocity("meta", 0.04, 52, 3, 72),
    velocity("tiktok", 0.12, 21, 8, 64),
    velocity("pinterest", 0.02, 60, 1, 18),
    velocity("snapchat", 0.06, 18, 2, 29),
    velocity("linkedin", 0.01, 95, 1, 12),
  ];

  const spendTrend: SpendTrendByPlatformInsight[] = [
    trend("google", [30, 28, 26, 24, 22, 20, 18]),
    trend("meta", [14, 13, 12, 11, 10, 10, 9]),
    trend("tiktok", [16, 15, 14, 13, 12, 11, 10]),
    trend("snapchat", [6, 7, 6, 7, 8, 7, 6]),
    trend("pinterest", [8, 8, 7, 8, 7, 8, 7]),
    trend("linkedin", [4, 4, 3, 4, 3, 4, 3]),
  ];

  return minimalPayload(angles, testing, spendTrend);
}

/** 24 unique angles when workspace + competitor payloads are merged. */
export const DEMO_FULL_ANGLE_BREAKDOWN_TOTAL = 24;
