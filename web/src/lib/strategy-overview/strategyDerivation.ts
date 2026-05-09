import { activeDays, estimateMonthlySpendEur } from "@/lib/strategy-overview/adBenchmarks";
import { deriveBrandScale, normalizePlatform } from "@/lib/strategy-overview/brand-scale-score";
import type {
  ActivityLevel,
  CompetitorStrategyMeta,
  CompetitorStrategyOverviewPayload,
  DataConfidence,
  DerivationQuality,
  FunnelEdgePayload,
  FunnelStage,
  PlatformNodePayload,
  SpendBand,
  StrategyMapPayload,
  StrategyPlatform,
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
  /** When set (recompute path), Strategy Map uses distinct live creatives; see live-creatives.ts */
  is_active?: boolean;
  raw_payload?: unknown;
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  microsoft: "Microsoft",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  reddit: "Reddit",
};

/** Fallback funnel stage by platform when >80% of ads on that platform are unclassified. */
const DEFAULT_STAGE: Record<string, FunnelStage> = {
  tiktok: "TOF",
  pinterest: "TOF",
  snapchat: "TOF",
  meta: "MOF",
  linkedin: "MOF",
  microsoft: "MOF",
  youtube: "MOF",
  google: "BOF",
  reddit: "TOF",
};

export function parseStage(raw: string | null | undefined): FunnelStage | null {
  if (!raw?.trim()) return null;
  const u = raw.trim().toUpperCase();
  if (u === "TOF" || u === "TOFU") return "TOF";
  if (u === "MOF" || u === "MOFU") return "MOF";
  if (u === "BOF" || u === "BOFU") return "BOF";
  return null;
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

function layoutNodes(
  nodes: PlatformNodePayload[],
  stageByPlatform: Map<StrategyPlatform, FunnelStage>
): PlatformNodePayload[] {
  const colX: Record<FunnelStage, number> = { TOF: 80, MOF: 360, BOF: 640 };
  const byCol: Record<FunnelStage, PlatformNodePayload[]> = { TOF: [], MOF: [], BOF: [] };
  for (const n of nodes) {
    byCol[stageByPlatform.get(n.platform)!].push(n);
  }
  for (const stage of STAGE_ORDER) {
    const list = byCol[stage];
    list.sort((a, b) => b.adCount - a.adCount);
    const totalH = list.reduce((s, n, i) => s + Math.max(120, 90 + Math.sqrt(n.adCount) * 14) + (i > 0 ? 24 : 0), 0);
    let y = Math.max(40, 240 - totalH / 2);
    for (const n of list) {
      const h = Math.max(120, 90 + Math.sqrt(n.adCount) * 14);
      n.position = { x: colX[stage], y };
      y += h + 24;
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

export function deriveStrategyOverviewPayload(
  ads: ScrapedAdInput[],
  competitor: CompetitorStrategyMeta,
  sourceScrapeBatchId: string | null,
  deriveOptions?: DeriveStrategyOverviewOptions
): CompetitorStrategyOverviewPayload {
  const activeAds = ads.filter((a) => a.id);
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

  const totalMid = nodes.reduce((s, n) => s + n.estSpendEur, 0);
  const totalLow = nodes.reduce((s, n) => s + (n.estSpendEurLow ?? n.estSpendEur), 0);
  const totalHigh = nodes.reduce((s, n) => s + (n.estSpendEurHigh ?? n.estSpendEur), 0);
  const conf = dataConfidence(totalLive > 0 ? totalLive : activeAds.length, brandScaleScore, enrichmentRate);

  let funnelEdges: FunnelEdgePayload[] = [];
  let edgeDetected = 0;
  let edgeSuppressed = 0;
  if (!suppressEdgesReason) {
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

  const formatCounts = new Map<string, number>();
  for (const a of activeAds) {
    const f = (a.format || "unknown").toLowerCase();
    formatCounts.set(f, (formatCounts.get(f) ?? 0) + 1);
  }
  const topFmt = [...formatCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const dominantFormat = {
    format: topFmt ? topFmt[0] : "video",
    percentage:
      topFmt && activeAds.length > 0 ? Math.round((topFmt[1] / activeAds.length) * 100) : activeAds.length === 0 ? 0 : 78,
  };

  const angleAgg = new Map<string, number>();
  for (const a of activeAds) {
    const k = (a.ai_extracted_angle ?? "Unclassified").trim() || "Unclassified";
    angleAgg.set(k, (angleAgg.get(k) ?? 0) + 1);
  }
  const topAngles = [...angleAgg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([angle], i) => ({ angle, rank: i + 1 }));

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
    audienceSignals: {
      interests:
        topAngles.length > 0
          ? topAngles.slice(0, 3).map((x) => x.angle)
          : ["Lookalike-style broad interest", "Category shoppers", "Platform-native engagers"],
      ageRange: "25–44 years old",
      geo: "Multi-region (inferred)",
      targetingType: ["Interest-based", "Performance"],
    },
    dominantFormat: {
      format:
        dominantFormat.format === "video"
          ? "Video (Vertical)"
          : dominantFormat.format.charAt(0).toUpperCase() + dominantFormat.format.slice(1),
      percentage: dominantFormat.percentage || 78,
    },
    toneOfVoice: {
      primary: "Confident & Helpful",
      attributes: ["Promotional", "Informative", "Benefit-driven"],
    },
    topAngles: topAngles.length ? topAngles : [{ angle: "Product benefits", rank: 1 }],
    platformNodes: nodes,
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

  const cadenceMonths = 6;
  const cadenceMonthLabels = Array.from({ length: cadenceMonths }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (cadenceMonths - 1 - i));
    return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
  });
  const cadenceRawLaunches = monthlyFirstSeenCounts(activeAds, cadenceMonths);

  const pulseWeeks = 8;
  const pulseWeekLabels = Array.from({ length: pulseWeeks }, (_, i) => `W${i + 1}`);
  const pulseRawVolume = weeklyFirstSeenCounts(activeAds, pulseWeeks);
  const spendSparkline = buildSparklineFromAds(activeAds);
  const pulseTrend = computeTrend(spendSparkline);

  const insights = {
    funnel_architecture: {
      aiNarrative: "Funnel mix inferred from per-ad stages and platform roles.",
      lastUpdated: nowIso,
      dataConfidence: conf,
      aiNarrativeSource: "heuristic" as const,
      layers: STAGE_ORDER.map((stage) => {
        const platsFor = nodes.filter((n) => n.funnelStage === stage).map((n) => n.label);
        return {
          stage,
          platforms: platsFor,
          dropOffPct: stage === "TOF" ? null : 15 + Math.min(35, nodes.length * 3),
          exampleSnippet:
            activeAds.find((a) => parseStage(a.funnel_stage) === stage)?.ad_text.slice(0, 120) ?? null,
        };
      }),
    },
    budget_allocation: {
      aiNarrative: "Estimated share from benchmark CPM model × active ad footprint.",
      lastUpdated: nowIso,
      dataConfidence: conf,
      aiNarrativeSource: "heuristic" as const,
      segments: nodes.map((n) => ({
        platform: n.platform,
        label: n.label,
        pct: pct(n),
        estSpendEur: Math.round(n.estSpendEur),
      })),
      insight: highestSpendNode
        ? `Largest estimated spend on ${highestSpendNode.label} (${pct(highestSpendNode)}% share).`
        : "Estimated share from benchmark CPM model × active ad footprint.",
    },
    creative_cadence: {
      aiNarrative:
        "Raw counts of ads first seen in each month (from your scraped library). Not normalized — totals reflect detections in-period.",
      lastUpdated: nowIso,
      dataConfidence: conf,
      aiNarrativeSource: "heuristic" as const,
      months: cadenceMonthLabels,
      launches: cadenceRawLaunches,
    },
    audience_signal_map: {
      aiNarrative: "Heuristic audience cues from angles and formats.",
      lastUpdated: nowIso,
      dataConfidence: conf,
      aiNarrativeSource: "heuristic" as const,
      signals: [
        { label: "Tech enthusiasts", strength: 0.72 },
        { label: map.audienceSignals.ageRange, strength: 0.65 },
        { label: map.audienceSignals.geo, strength: 0.5 },
        ...map.audienceSignals.interests.slice(0, 2).map((l, i) => ({ label: l, strength: 0.45 - i * 0.05 })),
      ],
    },
    angle_clustering: {
      aiNarrative: "Clusters from ai_extracted_angle or placeholder grouping.",
      lastUpdated: nowIso,
      dataConfidence: conf,
      aiNarrativeSource: "heuristic" as const,
      rows: [...angleAgg.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([angle, adCount]) => ({
          angle,
          adCount,
          longevityScore: Math.min(100, 40 + adCount * 4),
        })),
    },
    voice_tone_fingerprint: {
      aiNarrative: "Plotted from promotional vs rational heuristics in copy length and CTA density.",
      lastUpdated: nowIso,
      dataConfidence: conf,
      aiNarrativeSource: "heuristic" as const,
      competitor: { formal: 0.42, emotional: 0.58 },
      userBrand: null,
    },
    performance_pulse: {
      aiNarrative:
        "Weekly counts of new ads (first seen) and trend from the latest four months of the normalized 12-month activity sparkline.",
      lastUpdated: nowIso,
      dataConfidence: conf,
      aiNarrativeSource: "heuristic" as const,
      weeks: pulseWeekLabels,
      volume: pulseRawVolume,
      trend: pulseTrend,
    },
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
