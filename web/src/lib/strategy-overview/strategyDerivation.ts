import { activeDays, estimateMonthlySpendEur } from "@/lib/strategy-overview/adBenchmarks";
import { deriveBrandScale, normalizePlatform } from "@/lib/strategy-overview/brand-scale-score";
import { deriveSidebarInsights } from "@/lib/strategy-overview/derive-sidebar-insights";
import { strategyMapNodeSize } from "@/lib/strategy-overview/map-node-sizing";
import { applyFunnelCellLayout } from "@/lib/strategy-overview/layout-funnel-cells";
import { deriveFunnelCellEdges } from "@/lib/strategy-overview/funnel-cell-edges";
import type {
  ActivityLevel,
  CompetitorStrategyMeta,
  CompetitorStrategyOverviewPayload,
  DataConfidence,
  DerivationQuality,
  FunnelCellId,
  FunnelCellNodePayload,
  FunnelEdgePayload,
  FunnelStage,
  PlatformNodePayload,
  SpendBand,
  StrategyMapPayload,
  StrategyPlatform,
  AnglesByPlatformInsight,
  SpendTrendByPlatformInsight,
  TestingVelocityByPlatformInsight,
  VoiceToneByPlatformInsight,
} from "@/lib/strategy-overview/payload-types";
import {
  buildBrandFootprintFromAds,
  estimateBrandMonthlySpend,
  isSpendEstimatorV2Enabled,
  loadEstimatorConfigFromEnv,
  logSpendEstimateDebug,
  LIVE_AD_RECENCY_DAYS,
  liveCreativeGroupsPerPlatform,
  type FootprintAdInput,
  type SpendEstimate,
} from "@/lib/spend-estimator";

const STAGE_ORDER: FunnelStage[] = ["TOF", "MOF", "BOF"];

const DERIVATION_PLATFORM_ORDER: StrategyPlatform[] = [
  "meta",
  "google",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
];

function earliestFirstSeenIsoForPlatform(ads: ScrapedAdInput[], pl: StrategyPlatform): string | null {
  let min: number | null = null;
  for (const a of ads) {
    const p = normalizePlatform(a.platform);
    if (p !== pl) continue;
    const t = Date.parse(a.first_seen_at);
    if (!Number.isFinite(t)) continue;
    if (min === null || t < min) min = t;
  }
  return min === null ? null : new Date(min).toISOString();
}

function launchTimeMsForTrend(ad: ScrapedAdInput): number {
  const raw = ad.ai_extracted_launch_date?.trim();
  if (raw) {
    const t = Date.parse(raw);
    if (Number.isFinite(t)) return t;
  }
  return Date.parse(ad.first_seen_at);
}

/** Per-platform weekly ad launch / first-seen counts, normalized 0–100 for sparklines. */
export function computeSpendTrendByPlatform(ads: ScrapedAdInput[], weeks = 12): SpendTrendByPlatformInsight[] {
  const now = Date.now();
  const weekMs = 7 * 86_400_000;
  const platformMap = new Map<StrategyPlatform, ScrapedAdInput[]>();

  for (const ad of ads) {
    const platform = normalizePlatform(ad.platform);
    if (!platform) continue;
    if (!platformMap.has(platform)) platformMap.set(platform, []);
    platformMap.get(platform)!.push(ad);
  }

  const out: SpendTrendByPlatformInsight[] = [];

  for (const [platform, list] of platformMap.entries()) {
    const buckets = new Array(weeks).fill(0);
    for (const ad of list) {
      const launchTime = launchTimeMsForTrend(ad);
      if (!Number.isFinite(launchTime)) continue;
      const weeksAgo = Math.floor((now - launchTime) / weekMs);
      if (weeksAgo >= 0 && weeksAgo < weeks) {
        buckets[weeks - 1 - weeksAgo] += 1;
      }
    }

    const max = Math.max(1, ...buckets);
    const normalized = buckets.map((b) => Math.round((b / max) * 100));

    const recent = buckets.slice(-4).reduce((s, n) => s + n, 0) / 4;
    const previous = buckets.slice(-8, -4).reduce((s, n) => s + n, 0) / 4;
    const pctChange =
      previous > 0 ? Math.round(((recent - previous) / previous) * 100) : recent > 0 ? 100 : 0;
    const direction: "up" | "down" | "flat" =
      pctChange > 10 ? "up" : pctChange < -10 ? "down" : "flat";

    out.push({ platform, weekBuckets: normalized, direction, pctChange });
  }

  out.sort(
    (a, b) => DERIVATION_PLATFORM_ORDER.indexOf(a.platform) - DERIVATION_PLATFORM_ORDER.indexOf(b.platform)
  );
  return out;
}

export type DeriveStrategyOverviewOptions = {
  spendV2?: {
    footprintRows: FootprintAdInput[];
    competitorId: string;
    userId: string;
    brandDomain: string | null;
    lastScrapedAt: string | null;
  };
};

export { normalizePlatform, deriveBrandScale } from "@/lib/strategy-overview/brand-scale-score";

export type VoiceToneVector = {
  formal: number;
  emotional: number;
  confidence: number;
};

export type ScrapedAdInput = {
  id: string;
  platform: string;
  ad_text: string;
  format: string;
  first_seen_at: string;
  last_seen_at: string;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  ai_enrichment_status?: string | null;
  /** Platform-reported launch when persisted from scrape; timeline falls back to {@link first_seen_at} when null. */
  ai_extracted_launch_date?: string | null;
  ai_extracted_voice_tone?: unknown;
  /** When set (recompute path), Strategy Map uses distinct live creatives; see live-creatives.ts */
  is_active?: boolean;
  raw_payload?: unknown;
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

/** Fallback funnel stage by platform when >80% of ads on that platform are unclassified. */
const DEFAULT_STAGE: Record<string, FunnelStage> = {
  tiktok: "TOF",
  pinterest: "TOF",
  snapchat: "TOF",
  meta: "MOF",
  linkedin: "MOF",
  google: "BOF",
};

export function parseStage(raw: string | null | undefined): FunnelStage | null {
  if (!raw?.trim()) return null;
  const u = raw.trim().toUpperCase();
  if (u === "TOF" || u === "TOFU") return "TOF";
  if (u === "MOF" || u === "MOFU") return "MOF";
  if (u === "BOF" || u === "BOFU") return "BOF";
  return null;
}

function computeAvgActiveDaysFromAds(ads: ScrapedAdInput[]): number {
  if (ads.length === 0) return 0;
  const now = Date.now();
  const days = ads.map((a) => {
    const first = a.first_seen_at ? new Date(a.first_seen_at).getTime() : now;
    return Math.max(1, (now - first) / (1000 * 60 * 60 * 24));
  });
  return days.reduce((a, b) => a + b, 0) / days.length;
}

/** Funnel stages as rows; platforms as columns — positions applied in layout-funnel-cells. */
function layoutFunnelCells(cells: FunnelCellNodePayload[]): FunnelCellNodePayload[] {
  return applyFunnelCellLayout(cells);
}

/**
 * One node per (platform × funnel stage) for the Strategy Map. Unclassified ads are omitted;
 * platforms with only unclassified creatives produce no cells.
 */
export function deriveFunnelCells(
  byPlatformLive: Map<StrategyPlatform, ScrapedAdInput[]>,
  brandScaleScore: number,
  spendV2OverridesByPlatformStage?: Map<string, { low: number; mid: number; high: number }>
): FunnelCellNodePayload[] {
  const cells: FunnelCellNodePayload[] = [];

  for (const [platform, liveList] of byPlatformLive) {
    const byStage = new Map<FunnelStage, ScrapedAdInput[]>();

    for (const ad of liveList) {
      const stage = parseStage(ad.funnel_stage);
      if (stage == null) continue;
      if (!byStage.has(stage)) byStage.set(stage, []);
      byStage.get(stage)!.push(ad);
    }

    for (const [stage, ads] of byStage) {
      if (ads.length === 0) continue;

      const sortedNewestFirst = [...ads].sort((a, b) => {
        const aDate = a.first_seen_at ? new Date(a.first_seen_at).getTime() : 0;
        const bDate = b.first_seen_at ? new Date(b.first_seen_at).getTime() : 0;
        return bDate - aDate;
      });

      const avgActiveDays = computeAvgActiveDaysFromAds(ads);
      const spend = estimateMonthlySpendEur({
        platform,
        adCount: ads.length,
        avgActiveDays,
        brandScaleScore,
      });

      const overrideKey = `${platform}:${stage}`;
      const override = spendV2OverridesByPlatformStage?.get(overrideKey);
      const finalSpend = override ?? spend;

      const cellConfidence: "high" | "medium" | "low" =
        ads.length >= 5 ? "high" : ads.length >= 3 ? "medium" : "low";

      cells.push({
        id: `${platform}:${stage}` as FunnelCellId,
        platform,
        label: PLATFORM_LABEL[platform] ?? platform,
        funnelStage: stage,
        adCount: ads.length,
        estSpendEur: finalSpend.mid,
        estSpendEurLow: finalSpend.low,
        estSpendEurHigh: finalSpend.high,
        sampleAdIds: sortedNewestFirst.slice(0, 8).map((a) => a.id),
        cellConfidence,
        position: { x: 0, y: 0 },
      });
    }
  }

  return layoutFunnelCells(cells);
}

function activityLevelForCount(count: number, maxCount: number): ActivityLevel {
  if (maxCount <= 0 || count <= 0) return "Very Low";
  const r = count / maxCount;
  if (r >= 0.85) return "Very High";
  if (r >= 0.55) return "High";
  if (r >= 0.3) return "Medium";
  if (r >= 0.12) return "Low";
  return "Very Low";
}

function spendVsSimilarLabel(brandScaleScore: number): SpendBand {
  if (brandScaleScore >= 3.5) return "Very High";
  if (brandScaleScore >= 2.5) return "High";
  if (brandScaleScore >= 1.5) return "Medium";
  if (brandScaleScore >= 0.8) return "Low";
  return "Very Low";
}

function dataConfidence(
  activeCount: number,
  brandScaleScore: number,
  enrichmentRate: number
): DataConfidence {
  const countScore = activeCount >= 40 ? 1 : activeCount >= 12 ? 0.6 : 0.2;
  const enrichScore = enrichmentRate >= 0.7 ? 1 : enrichmentRate >= 0.3 ? 0.6 : 0.2;
  const scaleScore = brandScaleScore >= 1.0 && brandScaleScore <= 4.0 ? 1 : 0.6;
  const composite = countScore * 0.5 + enrichScore * 0.3 + scaleScore * 0.2;
  if (composite >= 0.75) return "high";
  if (composite >= 0.45) return "medium";
  return "low";
}

/** Ads that contribute to funnel-edge angle overlap (classified + angle text). */
export function adsForEdgeAngles(ads: ScrapedAdInput[]): ScrapedAdInput[] {
  return ads.filter((a) => parseStage(a.funnel_stage) != null && (a.ai_extracted_angle ?? "").trim().length > 0);
}

function angleTokens(ads: ScrapedAdInput[]): Map<string, Set<string>> {
  const byPlat = new Map<string, Set<string>>();
  for (const a of adsForEdgeAngles(ads)) {
    const pl = normalizePlatform(a.platform);
    if (!pl) continue;
    const ang = (a.ai_extracted_angle ?? "general").trim().toLowerCase() || "general";
    if (!byPlat.has(pl)) byPlat.set(pl, new Set());
    byPlat.get(pl)!.add(ang);
  }
  return byPlat;
}

export function enrichedAdsByPlatform(ads: ScrapedAdInput[]): Map<StrategyPlatform, number> {
  const m = new Map<StrategyPlatform, number>();
  for (const a of ads) {
    if (parseStage(a.funnel_stage) == null || !(a.ai_extracted_angle ?? "").trim()) continue;
    const pl = normalizePlatform(a.platform);
    if (!pl) continue;
    m.set(pl, (m.get(pl) ?? 0) + 1);
  }
  return m;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union <= 0 ? 0 : inter / union;
}

const MIN_ENRICHED_PER_PLATFORM_FOR_EDGE = 5;

export function deriveFunnelEdges(params: {
  platforms: StrategyPlatform[];
  stageByPlatform: Map<StrategyPlatform, FunnelStage>;
  angleByPlatform: Map<string, Set<string>>;
  enrichedAdsByPlatform: Map<StrategyPlatform, number>;
  minEnrichedPerPlatform?: number;
}): { edges: FunnelEdgePayload[]; detected: number; suppressed: number } {
  const { platforms, stageByPlatform, angleByPlatform, enrichedAdsByPlatform } = params;
  const minPl = params.minEnrichedPerPlatform ?? MIN_ENRICHED_PER_PLATFORM_FOR_EDGE;
  const edges: FunnelEdgePayload[] = [];
  const seen = new Set<string>();
  let detected = 0;

  const stageIndex = (s: FunnelStage) => STAGE_ORDER.indexOf(s);

  for (let i = 0; i < platforms.length; i++) {
    for (let j = 0; j < platforms.length; j++) {
      if (i === j) continue;
      const from = platforms[i]!;
      const to = platforms[j]!;
      const sf = stageByPlatform.get(from)!;
      const st = stageByPlatform.get(to)!;
      if (stageIndex(st) <= stageIndex(sf)) continue;

      const key = `${from}->${to}`;
      if (seen.has(key)) continue;

      const overlap = jaccard(angleByPlatform.get(from) ?? new Set(), angleByPlatform.get(to) ?? new Set());
      let confidence = 0.35 + (stageIndex(st) - stageIndex(sf)) * 0.18;
      confidence += overlap * 0.35;
      confidence = Math.min(0.95, confidence);

      if (confidence < 0.4) continue;

      detected += 1;

      const enFrom = enrichedAdsByPlatform.get(from) ?? 0;
      const enTo = enrichedAdsByPlatform.get(to) ?? 0;
      if (enFrom < minPl || enTo < minPl) continue;

      const style: "solid" | "dashed" = confidence >= 0.72 ? "solid" : "dashed";
      const reasoning =
        overlap >= 0.2
          ? `Creative angles overlap between ${PLATFORM_LABEL[from] ?? from} and ${PLATFORM_LABEL[to] ?? to}; staged funnel progression.`
          : `Heavier ${sf} on ${PLATFORM_LABEL[from] ?? from} feeding ${st} on ${PLATFORM_LABEL[to] ?? to}.`;

      edges.push({ from, to, confidence, reasoning, style });
      seen.add(key);
    }
  }

  const suppressed = detected - edges.length;
  return { edges, detected, suppressed };
}

function angleTokensByCell(
  byPlatformLive: Map<StrategyPlatform, ScrapedAdInput[]>
): Map<FunnelCellId, Set<string>> {
  const byCell = new Map<FunnelCellId, Set<string>>();
  for (const [platform, liveList] of byPlatformLive) {
    for (const a of adsForEdgeAngles(liveList)) {
      const stage = parseStage(a.funnel_stage);
      if (!stage) continue;
      const id = `${platform}:${stage}` as FunnelCellId;
      const ang = (a.ai_extracted_angle ?? "general").trim().toLowerCase() || "general";
      if (!byCell.has(id)) byCell.set(id, new Set());
      byCell.get(id)!.add(ang);
    }
  }
  return byCell;
}

function enrichedCountByCell(
  byPlatformLive: Map<StrategyPlatform, ScrapedAdInput[]>
): Map<FunnelCellId, number> {
  const m = new Map<FunnelCellId, number>();
  for (const [platform, liveList] of byPlatformLive) {
    for (const a of liveList) {
      const stage = parseStage(a.funnel_stage);
      if (!stage || !(a.ai_extracted_angle ?? "").trim()) continue;
      const id = `${platform}:${stage}` as FunnelCellId;
      m.set(id, (m.get(id) ?? 0) + 1);
    }
  }
  return m;
}

function layoutNodes(
  nodes: PlatformNodePayload[],
  stageByPlatform: Map<StrategyPlatform, FunnelStage>
): PlatformNodePayload[] {
  const colX: Record<FunnelStage, number> = { TOF: 32, MOF: 400, BOF: 768 };
  const byCol: Record<FunnelStage, PlatformNodePayload[]> = { TOF: [], MOF: [], BOF: [] };
  const maxCount = Math.max(1, ...nodes.map((n) => n.adCount));

  for (const n of nodes) {
    byCol[stageByPlatform.get(n.platform)!].push(n);
  }
  for (const stage of STAGE_ORDER) {
    const list = byCol[stage];
    list.sort((a, b) => b.adCount - a.adCount);
    const totalH = list.reduce((s, n, i) => {
      const { height } = strategyMapNodeSize(n.adCount, maxCount);
      return s + height + (i > 0 ? 36 : 0);
    }, 0);
    let y = Math.max(48, 280 - totalH / 2);
    for (const n of list) {
      const { height } = strategyMapNodeSize(n.adCount, maxCount);
      n.position = { x: colX[stage], y };
      y += height + 36;
    }
  }
  return nodes;
}

function buildSparklineFromAds(ads: ScrapedAdInput[]): number[] {
  const now = new Date();
  const months: number[] = Array(12).fill(0);
  for (const a of ads) {
    const d = new Date(a.first_seen_at);
    if (Number.isNaN(d.getTime())) continue;
    const diffM = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (diffM >= 0 && diffM < 12) {
      months[11 - diffM] += 1;
    }
  }
  const max = Math.max(1, ...months);
  return months.map((m) => Math.round((m / max) * 100));
}

/** Trend from last 4 points of the 12-month normalized sparkline (0–100 scale). */
export function computeTrend(sparkline: number[]): "up" | "down" | "flat" {
  const recent = sparkline.slice(-4);
  if (recent.length < 2) return "flat";
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  const delta = last - first;
  if (delta > 10) return "up";
  if (delta < -10) return "down";
  return "flat";
}

/** Raw count of ads whose first_seen_at falls in each month slot; index 0 = oldest of `slotCount` months. */
export function monthlyFirstSeenCounts(ads: ScrapedAdInput[], slotCount: number): number[] {
  const buckets = Array.from({ length: slotCount }, () => 0);
  const now = new Date();
  for (const a of ads) {
    const d = new Date(a.first_seen_at);
    if (Number.isNaN(d.getTime())) continue;
    const diffM = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (diffM < 0 || diffM >= slotCount) continue;
    const idx = slotCount - 1 - diffM;
    buckets[idx] += 1;
  }
  return buckets;
}

/** Raw count of ads by first_seen week; index 0 = oldest week, last = current week. */
export function weeklyFirstSeenCounts(ads: ScrapedAdInput[], weekCount: number): number[] {
  const buckets = Array.from({ length: weekCount }, () => 0);
  const now = Date.now();
  const MS_WEEK = 7 * 86400000;
  for (const a of ads) {
    const d = Date.parse(a.first_seen_at);
    if (!Number.isFinite(d)) continue;
    const diffMs = now - d;
    if (diffMs < 0) continue;
    const w = Math.floor(diffMs / MS_WEEK);
    if (w >= weekCount) continue;
    const idx = weekCount - 1 - w;
    buckets[idx] += 1;
  }
  return buckets;
}

function derivationQualityFromRate(rate: number): DerivationQuality {
  if (rate >= 0.7) return "high";
  if (rate >= 0.3) return "medium";
  return "low";
}

function parseVoiceToneVector(raw: unknown): VoiceToneVector | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const formal = Number(o.formal);
  const emotional = Number(o.emotional);
  const confidence = Number(o.confidence);
  if (![formal, emotional, confidence].every((n) => Number.isFinite(n))) return null;
  if (formal < 0 || formal > 1 || emotional < 0 || emotional > 1 || confidence < 0 || confidence > 1) {
    return null;
  }
  return { formal, emotional, confidence };
}

export function buildMonthlyLaunchTimeline(
  ads: ScrapedAdInput[],
  months: number
): { month: string; launchCount: number; detectionCount: number }[] {
  const buckets: { month: string; launchCount: number; detectionCount: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: d.toISOString().slice(0, 7),
      launchCount: 0,
      detectionCount: 0,
    });
  }
  for (const ad of ads) {
    const launchRaw = ad.ai_extracted_launch_date?.trim();
    const launchDate = launchRaw ? new Date(launchRaw) : null;
    const detectionDate = new Date(ad.first_seen_at);
    const dateToUse =
      launchDate && !Number.isNaN(launchDate.getTime()) ? launchDate : detectionDate;
    if (Number.isNaN(dateToUse.getTime())) continue;
    const monthKey = dateToUse.toISOString().slice(0, 7);
    const bucket = buckets.find((b) => b.month === monthKey);
    if (!bucket) continue;
    if (launchDate && !Number.isNaN(launchDate.getTime())) {
      bucket.launchCount += 1;
    } else {
      bucket.detectionCount += 1;
    }
  }
  return buckets;
}

export function computeTimelineDataQuality(ads: ScrapedAdInput[]): {
  realLaunchPct: number;
  qualityLabel: "high" | "medium" | "low";
  warning: string | null;
} {
  if (ads.length === 0) {
    return { realLaunchPct: 0, qualityLabel: "low", warning: "No ads to analyze." };
  }
  const realLaunchCount = ads.filter((a) => (a.ai_extracted_launch_date ?? "").trim().length > 0).length;
  const realLaunchPct = Math.round((realLaunchCount / ads.length) * 100);
  if (realLaunchPct >= 70) {
    return { realLaunchPct, qualityLabel: "high", warning: null };
  }
  if (realLaunchPct >= 30) {
    return {
      realLaunchPct,
      qualityLabel: "medium",
      warning: `Only ${realLaunchPct}% of ads have a platform-reported launch date. The rest use detection date (when first seen in your library), which can cluster around scrape time.`,
    };
  }
  return {
    realLaunchPct,
    qualityLabel: "low",
    warning:
      "Most ads lack a platform-reported launch date. This chart shows detection dates and may not reflect true launch timing.",
  };
}

export function computeFormatMix(ads: ScrapedAdInput[]): {
  format: string;
  count: number;
  sharePct: number;
}[] {
  const aggregator = new Map<string, number>();
  for (const ad of ads) {
    const format = (ad.format ?? "unknown").toLowerCase().trim();
    aggregator.set(format, (aggregator.get(format) ?? 0) + 1);
  }
  const total = ads.length;
  return Array.from(aggregator.entries())
    .map(([format, count]) => ({
      format,
      count,
      sharePct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeVoiceToneAverage(ads: ScrapedAdInput[]): {
  formal: number;
  emotional: number;
  confidence: number;
  insufficientData: boolean;
} | null {
  const scored = ads
    .map((a) => parseVoiceToneVector(a.ai_extracted_voice_tone))
    .filter((v): v is VoiceToneVector => v != null);
  if (scored.length < 3) return null;
  const avg = (key: keyof VoiceToneVector) =>
    scored.reduce((sum, s) => sum + (s[key] ?? 0), 0) / scored.length;
  return {
    formal: parseFloat(avg("formal").toFixed(2)),
    emotional: parseFloat(avg("emotional").toFixed(2)),
    confidence: parseFloat(avg("confidence").toFixed(2)),
    insufficientData: scored.length < 10,
  };
}

export function computeVoiceToneByPlatform(ads: ScrapedAdInput[]): VoiceToneByPlatformInsight[] {
  const grouped = new Map<StrategyPlatform, ScrapedAdInput[]>();
  for (const ad of ads) {
    if (parseVoiceToneVector(ad.ai_extracted_voice_tone) == null) continue;
    const platform = normalizePlatform(ad.platform);
    if (!platform) continue;
    if (!grouped.has(platform)) grouped.set(platform, []);
    grouped.get(platform)!.push(ad);
  }

  return Array.from(grouped.entries())
    .filter(([, list]) => list.length >= 3)
    .map(([platform, list]) => {
      const tones = list
        .map((a) => parseVoiceToneVector(a.ai_extracted_voice_tone))
        .filter((v): v is VoiceToneVector => v != null);
      const avg = (key: keyof VoiceToneVector) =>
        parseFloat((tones.reduce((s, t) => s + (t[key] ?? 0), 0) / tones.length).toFixed(2));
      return {
        platform,
        formal: avg("formal"),
        emotional: avg("emotional"),
        confidence: avg("confidence"),
        sampleSize: list.length,
      };
    })
    .sort((a, b) => b.sampleSize - a.sampleSize);
}

export function computeAnglesByPlatform(ads: ScrapedAdInput[]): AnglesByPlatformInsight[] {
  const angleMap = new Map<
    string,
    { count: number; platforms: Map<StrategyPlatform, number>; lifespanDays: number[] }
  >();

  for (const ad of ads) {
    const angle = (ad.ai_extracted_angle ?? "").trim();
    if (!angle || angle === "Unclassified") continue;

    if (!angleMap.has(angle)) {
      angleMap.set(angle, { count: 0, platforms: new Map(), lifespanDays: [] });
    }
    const entry = angleMap.get(angle)!;
    entry.count += 1;

    const platform = normalizePlatform(ad.platform);
    if (!platform) continue;
    entry.platforms.set(platform, (entry.platforms.get(platform) ?? 0) + 1);

    const firstSeen = new Date(ad.first_seen_at).getTime();
    const lastSeen = ad.last_seen_at ? new Date(ad.last_seen_at).getTime() : Date.now();
    entry.lifespanDays.push(Math.max(1, Math.floor((lastSeen - firstSeen) / 86_400_000)));
  }

  return Array.from(angleMap.entries())
    .map(([angle, data]) => {
      const platformCounts: Partial<Record<StrategyPlatform, number>> = {};
      for (const [pl, n] of data.platforms) {
        platformCounts[pl] = n;
      }
      return {
        angle,
        totalCount: data.count,
        platforms: Array.from(data.platforms.keys()).sort(),
        platformCounts,
        avgLifespanDays: Math.round(
          data.lifespanDays.reduce((s, d) => s + d, 0) / Math.max(1, data.lifespanDays.length)
        ),
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 12);
}

export function computeTestingVelocityByPlatform(ads: ScrapedAdInput[]): TestingVelocityByPlatformInsight[] {
  const grouped = new Map<StrategyPlatform, ScrapedAdInput[]>();
  for (const ad of ads) {
    const platform = normalizePlatform(ad.platform);
    if (!platform) continue;
    if (!grouped.has(platform)) grouped.set(platform, []);
    grouped.get(platform)!.push(ad);
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86_400_000;

  return Array.from(grouped.entries())
    .map(([platform, list]) => {
      const newIn30 = list.filter((a) => {
        const launchRaw = a.ai_extracted_launch_date?.trim();
        const launchTime = launchRaw
          ? new Date(launchRaw).getTime()
          : new Date(a.first_seen_at).getTime();
        return !Number.isNaN(launchTime) && launchTime >= thirtyDaysAgo;
      }).length;

      const totalActive = list.length;
      const testRate = totalActive > 0 ? parseFloat((newIn30 / totalActive).toFixed(2)) : 0;

      const lifespans = list.map((a) => {
        const first = new Date(a.first_seen_at).getTime();
        const last = a.last_seen_at ? new Date(a.last_seen_at).getTime() : now;
        return Math.max(1, Math.floor((last - first) / 86_400_000));
      });
      const avgLifespan = Math.round(lifespans.reduce((s, d) => s + d, 0) / Math.max(1, lifespans.length));

      return {
        platform,
        newIn30,
        totalActive,
        testRate,
        avgLifespanDays: avgLifespan,
      };
    })
    .sort((a, b) => b.totalActive - a.totalActive);
}

export function deriveStrategyOverviewPayload(
  ads: ScrapedAdInput[],
  competitor: CompetitorStrategyMeta,
  sourceScrapeBatchId: string | null,
  deriveOptions?: DeriveStrategyOverviewOptions
): CompetitorStrategyOverviewPayload {
  const activeAds = ads.filter((a) => Boolean(a.id) && normalizePlatform(a.platform) != null);
  const totalAds = activeAds.length;
  const enrichedCount = activeAds.filter(
    (a) => parseStage(a.funnel_stage) != null && (a.ai_extracted_angle ?? "").trim().length > 0
  ).length;
  const enrichmentRate = totalAds > 0 ? enrichedCount / totalAds : 0;
  const derivQuality = derivationQualityFromRate(enrichmentRate);

  console.log(
    `[derivation] start → enrichedAds=${enrichedCount} | totalAds=${totalAds} | enrichmentRate=${enrichmentRate.toFixed(2)}`
  );
  console.log(`[derivation] quality=${derivQuality}`);

  const byPlatform = new Map<StrategyPlatform, ScrapedAdInput[]>();
  for (const a of activeAds) {
    const pl = normalizePlatform(a.platform);
    if (!pl) continue;
    if (!byPlatform.has(pl)) byPlatform.set(pl, []);
    byPlatform.get(pl)!.push(a);
  }

  const nowMs = Date.now();
  const liveGroupsMap = liveCreativeGroupsPerPlatform(activeAds, nowMs, LIVE_AD_RECENCY_DAYS);

  const byPlatformLive = new Map<StrategyPlatform, ScrapedAdInput[]>();
  for (const [pl, list] of byPlatform) {
    const groups = liveGroupsMap.get(pl) ?? [];
    if (groups.length === 0) {
      byPlatformLive.set(pl, []);
      continue;
    }
    byPlatformLive.set(
      pl,
      groups.map((g) => ({
        ...g.representative,
        first_seen_at: new Date(g.firstSeenMinMs).toISOString(),
        last_seen_at: new Date(g.lastSeenMaxMs).toISOString(),
      }))
    );
  }

  let suppressEdgesReason: StrategyMapPayload["suppressEdgesReason"];
  const totalLive = [...byPlatformLive.values()].reduce((s, l) => s + l.length, 0);
  const sampleSize = totalLive > 0 ? totalLive : activeAds.length;
  if (byPlatform.size <= 1) suppressEdgesReason = "single_platform";
  else if (sampleSize < 5) suppressEdgesReason = "low_sample";

  const stageByPlatform = new Map<StrategyPlatform, FunnelStage>();
  const nodes: PlatformNodePayload[] = [];

  let maxCount = 0;
  for (const [, list] of byPlatformLive) {
    maxCount = Math.max(maxCount, list.length);
  }

  const adsForAngles = totalLive > 0 ? [...byPlatformLive.values()].flat() : activeAds;
  const angleByPlatform = angleTokens(adsForAngles);
  const enrByPl = enrichedAdsByPlatform(adsForAngles);

  const brandScaleScore = deriveBrandScale(activeAds, byPlatform);
  console.log(
    `[derivation] brandScaleScore=${brandScaleScore.toFixed(2)} competitor=${competitor.name} platforms=${byPlatform.size} ads=${activeAds.length}`
  );

  for (const [pl, liveList] of byPlatformLive) {
    const unclassifiedCount = liveList.filter((x) => parseStage(x.funnel_stage) == null).length;
    const unclassifiedRatio = liveList.length > 0 ? unclassifiedCount / liveList.length : 0;
    const classified = liveList.filter((x) => parseStage(x.funnel_stage) != null);
    let stage: FunnelStage;
    if (unclassifiedRatio > 0.8) {
      stage = DEFAULT_STAGE[pl] ?? "MOF";
    } else if (classified.length > 0) {
      const inferred = classified.map((x) => parseStage(x.funnel_stage)!);
      const counts = new Map<FunnelStage, number>();
      for (const s of inferred) counts.set(s, (counts.get(s) ?? 0) + 1);
      stage = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    } else {
      stage = "MOF";
    }
    stageByPlatform.set(pl, stage);

    const avgDays =
      liveList.reduce((s, x) => s + activeDays(x.first_seen_at, x.last_seen_at), 0) /
      Math.max(1, liveList.length);
    const spend = estimateMonthlySpendEur({
      platform: pl,
      adCount: liveList.length,
      avgActiveDays: avgDays,
      brandScaleScore,
    });

    nodes.push({
      platform: pl,
      label: PLATFORM_LABEL[pl] ?? pl,
      adCount: liveList.length,
      activityLevel: activityLevelForCount(liveList.length, maxCount),
      estSpendEur: spend.mid,
      estSpendEurLow: spend.low,
      estSpendEurHigh: spend.high,
      funnelStage: stage,
      position: { x: 0, y: 0 },
    });
  }

  layoutNodes(nodes, stageByPlatform);

  let spendEstimateV2: SpendEstimate | undefined;

  if (isSpendEstimatorV2Enabled() && deriveOptions?.spendV2 && deriveOptions.spendV2.footprintRows.length > 0) {
    const sv = deriveOptions.spendV2;
    const fp = buildBrandFootprintFromAds(
      sv.footprintRows,
      {
        competitorId: sv.competitorId,
        userId: sv.userId,
        brandName: competitor.name,
        brandDomain: sv.brandDomain,
        lastScrapedAt: sv.lastScrapedAt,
      },
      brandScaleScore
    );
    if (fp) {
      const estConfig = loadEstimatorConfigFromEnv();
      spendEstimateV2 = estimateBrandMonthlySpend(fp, estConfig);
      logSpendEstimateDebug(`derive:${competitor.name}`, fp, estConfig);

      for (const n of nodes) {
        const st = fp.platform_stats.find((s) => s.platform === n.platform);
        if (st) n.adCount = st.active_ads;
        const row = spendEstimateV2.perPlatform.find((x) => x.platform === n.platform);
        if (row) {
          n.estSpendEur = row.mid;
          n.estSpendEurLow = row.low;
          n.estSpendEurHigh = row.high;
        }
      }
    }
  }

  /**
   * Spend v2 is per-platform only today. Split each platform's modeled band across
   * funnel cells proportionally by classified live ad counts so cell ranges are mutually
   * exclusive and sum to the platform total (unclassified ads are excluded from cells).
   */
  let spendV2ByPlatformStage: Map<string, { low: number; mid: number; high: number }> | undefined;
  if (spendEstimateV2) {
    spendV2ByPlatformStage = new Map();
    for (const [pl, liveList] of byPlatformLive) {
      const row = spendEstimateV2.perPlatform.find((x) => x.platform === pl);
      if (!row) continue;
      const byStageCount = new Map<FunnelStage, number>();
      for (const ad of liveList) {
        const st = parseStage(ad.funnel_stage);
        if (!st) continue;
        byStageCount.set(st, (byStageCount.get(st) ?? 0) + 1);
      }
      const sum = [...byStageCount.values()].reduce((a, b) => a + b, 0);
      if (sum === 0) continue;
      for (const [stage, n] of byStageCount) {
        const f = n / sum;
        spendV2ByPlatformStage.set(`${pl}:${stage}`, {
          low: Math.round(row.low * f),
          mid: Math.round(row.mid * f),
          high: Math.round(row.high * f),
        });
      }
    }
    if (spendV2ByPlatformStage.size === 0) spendV2ByPlatformStage = undefined;
  }

  const funnelCells = deriveFunnelCells(byPlatformLive, brandScaleScore, spendV2ByPlatformStage);

  const totalMid = nodes.reduce((s, n) => s + n.estSpendEur, 0);
  const totalLow = nodes.reduce((s, n) => s + (n.estSpendEurLow ?? n.estSpendEur), 0);
  const totalHigh = nodes.reduce((s, n) => s + (n.estSpendEurHigh ?? n.estSpendEur), 0);
  const conf = dataConfidence(totalLive > 0 ? totalLive : activeAds.length, brandScaleScore, enrichmentRate);

  let funnelEdges: FunnelEdgePayload[] = [];
  let edgeDetected = 0;
  let edgeSuppressed = 0;
  const angleByCell = angleTokensByCell(byPlatformLive);
  const enrByCell = enrichedCountByCell(byPlatformLive);

  if (funnelCells.length > 0) {
    const allowCrossPlatform = suppressEdgesReason !== "single_platform" && suppressEdgesReason !== "low_sample";
    const { edges, detected, suppressed } = deriveFunnelCellEdges({
      cells: funnelCells,
      angleByCell,
      enrichedCountByCell: enrByCell,
      allowCrossPlatform,
    });
    funnelEdges = edges;
    edgeDetected = detected;
    edgeSuppressed = suppressed;
  } else if (!suppressEdgesReason) {
    const { edges, detected, suppressed } = deriveFunnelEdges({
      platforms: nodes.map((n) => n.platform),
      stageByPlatform,
      angleByPlatform,
      enrichedAdsByPlatform: enrByPl,
    });
    funnelEdges = edges;
    edgeDetected = detected;
    edgeSuppressed = suppressed;
  }
  console.log(`[derivation] funnelEdges detected=${edgeDetected} | suppressed=${edgeSuppressed}`);

  const sidebarInsights = deriveSidebarInsights(activeAds);

  const angleAgg = new Map<string, number>();
  for (const a of activeAds) {
    const k = (a.ai_extracted_angle ?? "Unclassified").trim() || "Unclassified";
    angleAgg.set(k, (angleAgg.get(k) ?? 0) + 1);
  }

  const map: StrategyMapPayload = {
    title: `${competitor.name} Full Funnel Strategy Map`,
    competitor,
    totalAdSpend: {
      value: Math.round(totalMid),
      low: Math.round(totalLow),
      high: Math.round(totalHigh),
      currency: "EUR",
      unit: "month",
      confidence: conf,
      brandScaleScore: Math.round(brandScaleScore * 10) / 10,
    },
    spendVsSimilar: spendVsSimilarLabel(brandScaleScore),
    spendTrendline: buildSparklineFromAds(activeAds),
    audienceSignals: sidebarInsights.audienceSignals,
    dominantFormat: sidebarInsights.dominantFormat,
    toneOfVoice: sidebarInsights.toneOfVoice,
    topAngles: sidebarInsights.topAngles,
    sidebarExtras: {
      formatMix: sidebarInsights.extras.formatMix.map((f) => ({
        label: f.label,
        sharePct: f.sharePct,
      })),
      angleCategories: sidebarInsights.extras.topAngleCategories.map((c) => ({
        label: c.label,
        count: c.count,
        sharePct: c.sharePct,
        category: c.category,
      })),
      voiceConfidence: sidebarInsights.extras.voiceConfidence,
    },
    platformNodes: nodes,
    funnelCells,
    funnelEdges,
    suppressEdgesReason,
    activeAdCount: totalLive > 0 ? totalLive : activeAds.length,
    platformCount: byPlatform.size,
    derivationQuality: derivQuality,
  };

  const nowIso = new Date().toISOString();
  const pct = (n: PlatformNodePayload) =>
    totalMid > 0 ? Math.round((n.estSpendEur / totalMid) * 100) : Math.round(100 / Math.max(1, nodes.length));

  const highestSpendNode = nodes.reduce<PlatformNodePayload | null>(
    (max, n) => (max == null || n.estSpendEur > max.estSpendEur ? n : max),
    null
  );

  const totalClassified = activeAds.filter((a) => parseStage(a.funnel_stage) != null).length;
  const insufficientFunnel = totalClassified < 5;

  const angleEntriesSorted = [...angleAgg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const unclassifiedCount = angleAgg.get("Unclassified") ?? 0;
  const unclassifiedRatio = activeAds.length > 0 ? unclassifiedCount / activeAds.length : 0;

  const voiceAvg = computeVoiceToneAverage(activeAds);
  const voiceSample = activeAds.filter((a) => parseVoiceToneVector(a.ai_extracted_voice_tone) != null).length;

  const timelineMonths = buildMonthlyLaunchTimeline(activeAds, 12);
  const timelineQuality = computeTimelineDataQuality(activeAds);
  const formatMixList = computeFormatMix(activeAds);

  const insights = {
    platform_footprint: {
      title: "Platform Footprint",
      subtitle: "Active ad presence per platform",
      tooltip:
        "Side-by-side platform comparison: active ads per platform and modeled monthly spend range (benchmark CPM × footprint — not invoiced spend).",
      aiNarrative: null,
      lastUpdated: nowIso,
      dataConfidence: conf,
      platforms: [...nodes]
        .map((n) => ({
          platform: n.platform,
          label: n.label,
          activeAds: n.adCount,
          estSpendEur: Math.round(n.estSpendEur),
          estSpendEurLow: Math.round(n.estSpendEurLow ?? n.estSpendEur),
          estSpendEurHigh: Math.round(n.estSpendEurHigh ?? n.estSpendEur),
          funnelStage: n.funnelStage,
          spendShare: pct(n),
          earliestFirstSeenAt: earliestFirstSeenIsoForPlatform(activeAds, n.platform),
        }))
        .sort((a, b) => b.activeAds - a.activeAds),
      totalActiveAds: nodes.reduce((sum, n) => sum + n.adCount, 0),
      totalEstSpendEur: Math.round(totalMid),
      totalEstSpendEurLow: Math.round(totalLow),
      totalEstSpendEurHigh: Math.round(totalHigh),
      platformCount: nodes.length,
    },
    budget_allocation: {
      title: "Budget Allocation",
      subtitle: "Estimated monthly spend share by platform",
      tooltip:
        "Estimated using benchmark CPM × active ad count × brand size multiplier × format coefficient. NOT invoiced spend.",
      aiNarrative: null,
      lastUpdated: nowIso,
      dataConfidence: conf,
      segments: nodes.map((n) => ({
        platform: n.platform,
        label: n.label,
        pct: pct(n),
        estSpendEur: Math.round(n.estSpendEur),
        adCount: n.adCount,
      })),
      totalEstSpendEur: Math.round(totalMid),
      insight: highestSpendNode
        ? `Estimated largest spend on ${highestSpendNode.label} (${pct(highestSpendNode)}% share).`
        : "No active ads detected on any platform.",
    },
    library_activity_timeline: {
      title: "Library Activity Timeline",
      subtitle: "Monthly count of ads by launch date",
      tooltip:
        "Monthly ad launches. Uses platform-reported launch date when available, otherwise shows when the ad first appeared in your scraped library.",
      aiNarrative: null,
      lastUpdated: nowIso,
      dataConfidence: conf,
      months: timelineMonths,
      dataQuality: timelineQuality,
    },
    funnel_distribution: {
      title: "Funnel Distribution",
      subtitle: "Share of ads by inferred funnel stage",
      tooltip:
        "Real share of active ads by funnel stage (TOF / MOF / BOF) using enriched `funnel_stage` when present; unclassified ads are excluded from stage totals.",
      aiNarrative: null,
      lastUpdated: nowIso,
      dataConfidence: conf,
      stages: STAGE_ORDER.map((stage) => {
        const adsAtStage = activeAds.filter((a) => parseStage(a.funnel_stage) === stage);
        const sharePct =
          activeAds.length > 0 ? Math.round((adsAtStage.length / activeAds.length) * 100) : 0;
        return {
          stage,
          adCount: adsAtStage.length,
          sharePct,
          platforms: Array.from(new Set(adsAtStage.map((a) => a.platform))).slice(0, 4),
          exampleSnippet: adsAtStage[0]?.ad_text?.slice(0, 120) ?? null,
        };
      }),
      totalClassified,
      totalAds: activeAds.length,
      insufficientData: insufficientFunnel,
    },
    angle_clustering: {
      title: "Angle Clustering",
      subtitle: "Top creative angles by ad count",
      tooltip:
        "Creative angles from enrichment (`ai_extracted_angle`). Each classified ad receives one label. “Unclassified” means missing or broad extraction.",
      aiNarrative: null,
      lastUpdated: nowIso,
      dataConfidence: conf,
      angles: angleEntriesSorted.map(([angleName, count]) => ({
        angle: angleName,
        adCount: count,
        sharePct: activeAds.length > 0 ? Math.round((count / activeAds.length) * 100) : 0,
        exampleSnippet:
          activeAds.find((ad) => {
            const label = (ad.ai_extracted_angle ?? "").trim() || "Unclassified";
            return label === angleName;
          })?.ad_text?.slice(0, 120) ?? null,
      })),
      unclassifiedPct: activeAds.length > 0 ? Math.round(unclassifiedRatio * 100) : 0,
      insufficientData: activeAds.length > 0 && unclassifiedRatio > 0.8,
    },
    voice_tone_position: {
      title: "Voice & Tone Position",
      subtitle: "Average tone across enriched ads",
      tooltip:
        "Average formality and emotional weighting from enrichment (`ai_extracted_voice_tone`): formal 0–1 (casual→formal), emotional 0–1 (rational→emotional), plus mean model confidence.",
      aiNarrative: null,
      lastUpdated: nowIso,
      dataConfidence: conf,
      competitor: voiceAvg,
      userBrand: null,
      sampleSize: voiceSample,
    },
    ad_format_mix: {
      title: "Ad Format Mix",
      subtitle: "Distribution of creative formats",
      tooltip: "Share of active ads by `format` from the scrape row (image, video, carousel, etc.).",
      aiNarrative: null,
      lastUpdated: nowIso,
      dataConfidence: conf,
      formats: formatMixList,
    },
    voice_tone_by_platform: computeVoiceToneByPlatform(activeAds),
    angles_by_platform: computeAnglesByPlatform(activeAds),
    testing_velocity_by_platform: computeTestingVelocityByPlatform(activeAds),
    spend_trend_by_platform: computeSpendTrendByPlatform(activeAds, 12),
  };

  return {
    version: 1,
    map,
    insights,
    sourceScrapeBatchId,
    derivationQuality: derivQuality,
    enrichedAdCount: enrichedCount,
    totalAdCount: totalAds,
    enrichmentRate,
    ...(spendEstimateV2 ? { spendEstimateV2 } : {}),
  };
}
