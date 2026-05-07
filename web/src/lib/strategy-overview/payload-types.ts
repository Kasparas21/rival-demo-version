/**
 * Typed payload stored in competitor_strategy_overview.payload (jsonb).
 * Kept as TS types only — runtime validation is light at API boundary.
 */

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
  | "microsoft"
  | "pinterest"
  | "snapchat"
  | "youtube"
  | "reddit";

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

export type FunnelEdgePayload = {
  from: StrategyPlatform;
  to: StrategyPlatform;
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
  platformNodes: PlatformNodePayload[];
  funnelEdges: FunnelEdgePayload[];
  /** When true, UI should hide edges and show banner */
  suppressEdgesReason?: "low_sample" | "single_platform";
  activeAdCount: number;
  platformCount: number;
  /** Map-level confidence from derivation enrichment rate */
  derivationQuality?: DerivationQuality;
};

export type InsightCardBase = {
  aiNarrative: string;
  lastUpdated: string;
  dataConfidence: DataConfidence;
  aiNarrativeSource?: NarrativeSource;
};

export type FunnelArchitectureCard = InsightCardBase & {
  layers: {
    stage: FunnelStage;
    platforms: string[];
    dropOffPct: number | null;
    exampleSnippet: string | null;
  }[];
};

export type BudgetAllocationCard = InsightCardBase & {
  segments: { platform: StrategyPlatform; label: string; pct: number; estSpendEur: number }[];
  insight: string;
};

export type CreativeCadenceCard = InsightCardBase & {
  months: string[];
  launches: number[];
};

export type AudienceSignalMapCard = InsightCardBase & {
  signals: { label: string; strength: number }[];
};

export type AngleClusteringCard = InsightCardBase & {
  rows: { angle: string; adCount: number; longevityScore: number }[];
};

export type VoiceToneFingerprintCard = InsightCardBase & {
  competitor: { formal: number; emotional: number };
  userBrand: { formal: number; emotional: number } | null;
};

export type PerformancePulseCard = InsightCardBase & {
  weeks: string[];
  volume: number[];
  trend: "up" | "down" | "flat";
};

export type InsightCardsPayload = {
  funnel_architecture: FunnelArchitectureCard;
  budget_allocation: BudgetAllocationCard;
  creative_cadence: CreativeCadenceCard;
  audience_signal_map: AudienceSignalMapCard;
  angle_clustering: AngleClusteringCard;
  voice_tone_fingerprint: VoiceToneFingerprintCard;
  performance_pulse: PerformancePulseCard;
};

export type PipelineStatus = "ok" | "no_ads_found";

export type CompetitorStrategyOverviewPayload = {
  version: 1;
  map: StrategyMapPayload;
  insights: InsightCardsPayload;
  sourceScrapeBatchId: string | null;
  pipelineStatus?: PipelineStatus;
  derivationQuality?: DerivationQuality;
  enrichedAdCount?: number;
  totalAdCount?: number;
  enrichmentRate?: number;
  lowEnrichmentConfidence?: boolean;
  insufficientEnrichedAds?: boolean;
};

export type StrategyInsightCardType = keyof InsightCardsPayload;
