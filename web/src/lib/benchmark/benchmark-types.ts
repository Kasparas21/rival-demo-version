export const BENCHMARK_PLATFORMS = [
  "meta",
  "google",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
] as const;

export type BenchmarkPlatformId = (typeof BENCHMARK_PLATFORMS)[number];

export const BENCHMARK_PLATFORM_LABELS: Record<BenchmarkPlatformId, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

export type BenchmarkEntityMetrics = {
  id: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  brandLogoUrl: string | null;
  isOwnBrand: boolean;
  lastScrapedAt: string | null;
  fingerprint: string;
  activityScore: number | null;
  activeAdCount: number;
  newAdsThisPeriod: number;
  platformsActive: Record<BenchmarkPlatformId, boolean>;
  platformsActiveCount: number;
  /** Days since the newest active ad was first seen (lower = fresher). */
  creativeFreshnessDays: number | null;
  extractedAngles: string[];
};

export type BenchmarkRankEntry = {
  entityId: string;
  rank: number;
  of: number;
  percentile: number;
};

export type BenchmarkAiSummary = {
  winning: string[];
  behind: string[];
  biggestOpportunity: string;
};

export type BenchmarkRecommendedMove = {
  title: string;
  detail: string;
  tab: string;
  sub?: string;
};

export type BenchmarkPayload = {
  ok: true;
  computedAt: string;
  combinedFingerprint: string;
  fromCache: boolean;
  ownBrand: BenchmarkEntityMetrics;
  competitors: BenchmarkEntityMetrics[];
  hero: {
    activityScoreYou: number | null;
    activityScoreAvg: number | null;
    activityScoreLeader: number | null;
    activityScoreRankLabel: string;
    activeAdsYou: number;
    activeAdsAvg: number;
    activeAdsRankLabel: string;
    platformsYouLabel: string;
    platformsAvg: number;
    biggestGapLine: string;
  };
  rankings: {
    activityScore: BenchmarkRankEntry[];
    activeAds: BenchmarkRankEntry[];
    platformsActive: BenchmarkRankEntry[];
  };
  platformOpportunities: BenchmarkPlatformId[];
  angleGaps: string[];
  aiSummary: BenchmarkAiSummary;
  recommendedMoves: BenchmarkRecommendedMove[];
  staleness: {
    showBanner: boolean;
    ownBrandStaleDays: number | null;
    ownBrandLowAdCount: boolean;
    message: string | null;
  };
  entities: BenchmarkEntityMetrics[];
};

export type BenchmarkApiResponse = BenchmarkPayload | { ok: false; error: string };
