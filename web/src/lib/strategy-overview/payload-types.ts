/**
 * Typed payload stored in competitor_strategy_overview.payload (jsonb).
 * Kept as TS types only — runtime validation is light at API boundary.
 */

import type { SpendEstimate } from "@/lib/spend-estimator/types";

export type FunnelStage = "TOF" | "MOF" | "BOF";

export type ActivityLevel = "Very Low" | "Low" | "Medium" | "High" | "Very High";

export type SpendBand = "Very Low" | "Low" | "Medium" | "High" | "Very High";

export type DataConfidence = "low" | "medium" | "high";

export type DerivationQuality = "high" | "medium" | "low";

export type NarrativeSource = "llm" | "heuristic";

export type StrategyPlatform =
  | "meta"
  | "google"
  | "linkedin"
  | "tiktok"
  | "pinterest"
  | "snapchat";

export type CompetitorStrategyMeta = {
  name: string;
  domain: string;
  logoUrl: string | null;
};

export type TotalAdSpend = {
  /** Midpoint of modeled range (EUR / month). */
  value: number;
  /** Lower bound from platform CPM benchmarks × brand scale (EUR / month). */
  low?: number;
  /** Upper bound from platform CPM benchmarks × brand scale (EUR / month). */
  high?: number;
  currency: string;
  unit: "month";
  confidence: DataConfidence;
  /** Observable brand scale used in the spend model (0.5–5.0). */
  brandScaleScore?: number;
};

export type PlatformNodePayload = {
  platform: StrategyPlatform;
  label: string;
  adCount: number;
  activityLevel: ActivityLevel;
  /** Midpoint modeled monthly spend (EUR). */
  estSpendEur: number;
  estSpendEurLow?: number;
  estSpendEurHigh?: number;
  funnelStage: FunnelStage;
  position: { x: number; y: number };
};

export type FunnelCellId = `${StrategyPlatform}:${FunnelStage}`;

export type FunnelCellNodePayload = {
  /** Composite id: "meta:TOF" */
  id: FunnelCellId;
  platform: StrategyPlatform;
  label: string;
  funnelStage: FunnelStage;
  adCount: number;
  estSpendEur: number;
  estSpendEurLow: number;
  estSpendEurHigh: number;
  /** First 8 ad ids in this cell, newest first, for thumbnail preview */
  sampleAdIds: string[];
  /** Cell-level confidence based on adCount + enrichment quality */
  cellConfidence: "high" | "medium" | "low";
  position: { x: number; y: number };
};

export type FunnelEdgePayload = {
  /** Platform id (legacy) or composite cell id e.g. "meta:TOF" */
  from: string;
  to: string;
  fromStage?: FunnelStage;
  toStage?: FunnelStage;
  confidence: number;
  reasoning: string;
  style: "solid" | "dashed";
};

export type AudienceSignals = {
  interests: string[];
  ageRange: string;
  geo: string;
  targetingType: string[];
};

/** Organic social platforms that can appear as channel nodes on the map. */
export type OrganicChannelPlatform =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube";

export type OrganicChannelNodePayload = {
  /** Composite id: "organic:instagram" */
  id: `organic:${OrganicChannelPlatform}`;
  platform: OrganicChannelPlatform;
  label: string;
  /** Posts in the lookback window (90d). */
  postCount: number;
  postsPerWeek: number;
  /** Mean likes+comments+shares per post in window. */
  avgEngagement: number;
  lastPostAt: string | null;
  /** Top organic themes (from stored organic insights) used for edge scoring + tooltips. */
  topThemes: string[];
  /** Paid platform this organic surface feeds (audience affinity), when the competitor runs ads there. */
  pairedPaidPlatform: StrategyPlatform | null;
};

export type EmailChannelNodePayload = {
  id: "email";
  label: string;
  /** Emails captured in the lookback window (90d). */
  emailCount: number;
  emailsPerWeek: number;
  dominantType: string | null;
  dominantAngle: string | null;
  /** Share of emails containing an offer (0-100). */
  offerSharePct: number;
  lastEmailAt: string | null;
  espDetected: string | null;
};

export type ChannelEdgeKind = "organic_to_paid" | "paid_to_email";

export type JourneyGoalKind =
  | "purchase"
  | "signup"
  | "lead_gen"
  | "install"
  | "subscribe"
  | "brand_awareness";

export type JourneyCatalogBreadth = "single" | "focused" | "catalog" | "unknown";

export type JourneyDestinationPayload = {
  url: string;
  displayUrl: string;
  adCount: number;
  sharePct: number;
};

export type JourneyGoalEdgeKind = "bof_to_goal" | "email_to_goal";

/** How a specific channel path contributes — not every path is the same journey. */
export type JourneyPathIntent =
  | "direct_sale"
  | "discount_sale"
  | "retargeting"
  | "nurture"
  | "awareness"
  | "lead_capture";

export type JourneyPathAlignment = "direct" | "supporting";

export type JourneyGoalEdgePayload = {
  from: string;
  to: "goal";
  kind: JourneyGoalEdgeKind;
  pathIntent: JourneyPathIntent;
  pathIntentLabel: string;
  /** Direct paths close the loop; supporting paths feed the macro outcome indirectly. */
  alignment: JourneyPathAlignment;
  confidence: number;
  reasoning: string;
  style: "solid" | "dashed";
};

export type JourneyPathIntentSummary = {
  intent: JourneyPathIntent;
  label: string;
  pathCount: number;
  sharePct: number;
};

export type JourneyGoalDeal = {
  label: string;
  source: "ad" | "email";
  code: string | null;
  channel: string | null;
};

export type JourneyGoalCategory = {
  label: string;
  url: string | null;
  adCount: number;
  sharePct: number;
};

export type JourneyGoalCreative = {
  adId: string;
  platform: string;
  imageUrl: string | null;
  headline: string | null;
  angle: string | null;
  landingUrl: string | null;
};

export type JourneyGoalLandingPreview = {
  url: string;
  displayUrl: string;
  adCount: number;
  sharePct: number;
  categoryLabel: string | null;
  previewImageUrl: string | null;
  platforms: string[];
};

/** Rich evidence assembled from ads, emails, LPs, and angles — powers the goal drill-down. */
export type JourneyGoalEvidence = {
  narrative: string;
  deals: JourneyGoalDeal[];
  categories: JourneyGoalCategory[];
  topCreatives: JourneyGoalCreative[];
  landingPreviews: JourneyGoalLandingPreview[];
  angleHighlights: string[];
  emailOfferSummary: string | null;
};

/**
 * Terminal conversion goal inferred from BOF ads, landing pages, and email.
 * Attached fresh at API read time alongside channelSignals.
 */
export type StrategyJourneyGoal = {
  version: 1;
  computedAt: string;
  kind: JourneyGoalKind;
  label: string;
  subtitle: string;
  catalogBreadth: JourneyCatalogBreadth;
  catalogLabel: string;
  topDestinations: JourneyDestinationPayload[];
  goalEdges: JourneyGoalEdgePayload[];
  /** Per-path roles that roll up to the macro outcome (retargeting, discount, etc.). */
  pathIntentBreakdown: JourneyPathIntentSummary[];
  /** Scraped ads, emails, LP paths, creatives, and promos behind the inference. */
  evidence: JourneyGoalEvidence;
  /** e.g. "Organic → Paid ads → Email → Purchase on site" */
  journeySummary: string;
  /** One-line macro framing for the map. */
  macroFraming: string;
  signals: string[];
  confidence: number;
};

export type ChannelEdgePayload = {
  /** Channel node id or funnel cell id. */
  from: string;
  to: string;
  kind: ChannelEdgeKind;
  confidence: number;
  reasoning: string;
  style: "solid" | "dashed";
};

/**
 * Email + organic channel layer for the strategy map. Computed fresh at read
 * time (not persisted with the ads-fingerprinted cache) because these sources
 * update on their own cadence.
 */
export type StrategyChannelSignals = {
  version: 1;
  computedAt: string;
  organicNodes: OrganicChannelNodePayload[];
  emailNode: EmailChannelNodePayload | null;
  channelEdges: ChannelEdgePayload[];
};

export type StrategyMapPayload = {
  title: string;
  competitor: CompetitorStrategyMeta;
  totalAdSpend: TotalAdSpend;
  spendVsSimilar: SpendBand;
  spendTrendline: number[];
  audienceSignals: AudienceSignals;
  dominantFormat: { format: string; percentage: number };
  toneOfVoice: { primary: string; attributes: string[] };
  topAngles: { angle: string; rank: number }[];
  /** Richer sidebar breakdown (format mix, angle categories) — optional on older caches */
  sidebarExtras?: {
    formatMix: { label: string; sharePct: number }[];
    angleCategories: { label: string; count: number; sharePct: number; category: string }[];
    voiceConfidence: number | null;
  };
  platformNodes: PlatformNodePayload[];
  /** Per (platform × funnel stage); optional for older cached payloads */
  funnelCells?: FunnelCellNodePayload[];
  funnelEdges: FunnelEdgePayload[];
  /** When true, UI should hide edges and show banner */
  suppressEdgesReason?: "low_sample" | "single_platform";
  activeAdCount: number;
  platformCount: number;
  /** Map-level confidence from derivation enrichment rate */
  derivationQuality?: DerivationQuality;
};

export type InsightCardBase = {
  title: string;
  subtitle: string;
  tooltip: string;
  /** Optional one-line insight; usually filled by the Sonnet narrative pass. */
  aiNarrative?: string | null;
  lastUpdated: string;
  dataConfidence: DataConfidence;
  aiNarrativeSource?: NarrativeSource;
};

export type FunnelDistributionCard = InsightCardBase & {
  stages: {
    stage: FunnelStage;
    adCount: number;
    sharePct: number;
    platforms: string[];
    exampleSnippet: string | null;
  }[];
  totalClassified: number;
  totalAds: number;
  insufficientData: boolean;
};

export type BudgetAllocationCard = InsightCardBase & {
  segments: {
    platform: StrategyPlatform;
    label: string;
    pct: number;
    estSpendEur: number;
    adCount: number;
  }[];
  totalEstSpendEur: number;
  insight: string;
};

export type LibraryActivityTimelineCard = InsightCardBase & {
  months: {
    month: string;
    launchCount: number;
    detectionCount: number;
  }[];
  dataQuality: {
    realLaunchPct: number;
    qualityLabel: "high" | "medium" | "low";
    warning: string | null;
  };
};

export type AdFormatMixCard = InsightCardBase & {
  formats: {
    format: string;
    count: number;
    sharePct: number;
  }[];
};

export type AngleClusteringCard = InsightCardBase & {
  angles: {
    angle: string;
    adCount: number;
    sharePct: number;
    exampleSnippet: string | null;
  }[];
  unclassifiedPct: number;
  insufficientData: boolean;
};

export type VoiceTonePositionCard = InsightCardBase & {
  competitor: {
    formal: number;
    emotional: number;
    confidence: number;
    insufficientData: boolean;
  } | null;
  userBrand: { formal: number; emotional: number } | null;
  sampleSize: number;
};

export type PlatformFootprintCard = InsightCardBase & {
  platforms: {
    platform: StrategyPlatform;
    label: string;
    activeAds: number;
    estSpendEur: number;
    estSpendEurLow?: number;
    estSpendEurHigh?: number;
    funnelStage: FunnelStage;
    spendShare: number;
    /** Earliest `first_seen_at` among active ads on this platform (ISO), for “Active since” UI. */
    earliestFirstSeenAt?: string | null;
  }[];
  totalActiveAds: number;
  totalEstSpendEur: number;
  totalEstSpendEurLow?: number;
  totalEstSpendEurHigh?: number;
  platformCount: number;
};

/** Per-platform weekly launch/first-seen buckets (normalized), for Comparison sparklines. */
export type SpendTrendByPlatformInsight = {
  platform: StrategyPlatform;
  weekBuckets: number[];
  direction: "up" | "down" | "flat";
  pctChange: number;
};

/** Per-platform voice averages for Comparison to Your Brand (optional on cached payloads). */
export type VoiceToneByPlatformInsight = {
  platform: StrategyPlatform;
  formal: number;
  emotional: number;
  confidence: number;
  sampleSize: number;
};

/** Angle × platform rollups for comparison panels. */
export type AnglesByPlatformInsight = {
  angle: string;
  totalCount: number;
  platforms: StrategyPlatform[];
  platformCounts: Partial<Record<StrategyPlatform, number>>;
  avgLifespanDays: number;
};

/** Test rate and lifespan per platform for comparison velocity matrix. */
export type TestingVelocityByPlatformInsight = {
  platform: StrategyPlatform;
  newIn30: number;
  totalActive: number;
  testRate: number;
  avgLifespanDays: number;
};

export type AudienceInferenceSegment = {
  name: string;
  confidence: number;
  signals: string[];
};

/** Cached Sonnet audience inference (Comparison + Strategy recompute). */
export type AudienceInferenceResult = {
  segments: AudienceInferenceSegment[];
  primarySegmentName: string;
  summary: string;
};

export type InsightCardsPayload = {
  platform_footprint: PlatformFootprintCard;
  budget_allocation: BudgetAllocationCard;
  library_activity_timeline: LibraryActivityTimelineCard;
  funnel_distribution: FunnelDistributionCard;
  angle_clustering: AngleClusteringCard;
  voice_tone_position: VoiceTonePositionCard;
  ad_format_mix: AdFormatMixCard;
  voice_tone_by_platform?: VoiceToneByPlatformInsight[];
  angles_by_platform?: AnglesByPlatformInsight[];
  testing_velocity_by_platform?: TestingVelocityByPlatformInsight[];
  spend_trend_by_platform?: SpendTrendByPlatformInsight[];
};

export type PipelineStatus = "ok" | "no_ads_found";

export type CompetitorStrategyOverviewPayload = {
  version: 1;
  map: StrategyMapPayload;
  insights: InsightCardsPayload;
  sourceScrapeBatchId: string | null;
  /** Deterministic v2 model (when STRATEGY_SPEND_ESTIMATOR_V2=1). Legacy rows (e.g. youtube) are excluded at derivation. */
  spendEstimateV2?: SpendEstimate;
  pipelineStatus?: PipelineStatus;
  derivationQuality?: DerivationQuality;
  enrichedAdCount?: number;
  totalAdCount?: number;
  enrichmentRate?: number;
  lowEnrichmentConfidence?: boolean;
  insufficientEnrichedAds?: boolean;
  /** Cached per brand; invalidated with strategy model version / recompute. */
  audience_inference?: AudienceInferenceResult | null;
  /** True when persisted from synchronous fast-path derive (not full LLM recompute). */
  derivedFastPath?: boolean;
  /**
   * Email + organic channel layer. Attached fresh at API read time; never
   * trusted from client/session caches older than the current shape.
   */
  channelSignals?: StrategyChannelSignals | null;
  journeyGoal?: StrategyJourneyGoal | null;
};

/** Keys persisted in `strategy_insights_cards` — excludes comparison-only insight augmentations. */
export type StrategyInsightCardType =
  | "platform_footprint"
  | "budget_allocation"
  | "library_activity_timeline"
  | "funnel_distribution"
  | "angle_clustering"
  | "voice_tone_position"
  | "ad_format_mix";
