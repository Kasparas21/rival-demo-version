import type { SupabaseClient } from "@supabase/supabase-js";

import {
  BENCHMARK_PLATFORMS,
  type BenchmarkAiSummary,
  type BenchmarkEntityMetrics,
  type BenchmarkPayload,
  type BenchmarkPlatformId,
  type BenchmarkRankEntry,
  type BenchmarkRecommendedMove,
} from "@/lib/benchmark/benchmark-types";
import { runBenchmarkLlm } from "@/lib/benchmark/run-benchmark-llm";
import { computeActiveAdsFingerprint } from "@/lib/strategy-overview/active-ads-fingerprint";
import type { Database } from "@/lib/supabase/types";

const NEW_ADS_PERIOD_DAYS = 7;
const STALE_OWN_BRAND_DAYS = 10;
const LOW_AD_COUNT_RATIO = 0.25;

type SavedRow = {
  id: string;
  name: string | null;
  brand_name: string | null;
  brand_domain: string | null;
  logo_url: string | null;
  brand_logo_url: string | null;
  slug: string;
  last_scraped_at: string | null;
  is_workspace_brand: boolean;
};

type AdRow = {
  platform: string;
  first_seen_at: string;
  last_seen_at: string;
  ai_extracted_angle: string | null;
};

function displayName(row: SavedRow): string {
  return row.brand_name?.trim() || row.name?.trim() || row.slug;
}

function displayDomain(row: SavedRow): string {
  return row.brand_domain?.trim() || row.slug;
}

function normalizePlatform(platform: string): BenchmarkPlatformId | null {
  const p = platform.trim().toLowerCase();
  return (BENCHMARK_PLATFORMS as readonly string[]).includes(p) ? (p as BenchmarkPlatformId) : null;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function rankEntities(
  entities: BenchmarkEntityMetrics[],
  pick: (e: BenchmarkEntityMetrics) => number | null,
  higherIsBetter: boolean,
): BenchmarkRankEntry[] {
  const scored = entities
    .map((e) => ({ id: e.id, value: pick(e) }))
    .filter((x): x is { id: string; value: number } => x.value != null && Number.isFinite(x.value));

  if (scored.length === 0) return [];

  const sorted = [...scored].sort((a, b) => (higherIsBetter ? b.value - a.value : a.value - b.value));
  const of = entities.length;

  return entities.map((e) => {
    const hit = scored.find((s) => s.id === e.id);
    if (!hit) return { entityId: e.id, rank: of, of, percentile: 0 };
    const rank = sorted.findIndex((s) => s.id === e.id) + 1;
    const percentile = of <= 1 ? 100 : Math.round(((of - rank) / (of - 1)) * 100);
    return { entityId: e.id, rank, of, percentile };
  });
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function buildCombinedFingerprint(fingerprints: string[]): string {
  return fingerprints.slice().sort().join("|");
}

async function loadBenchmarkSavedRows(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId?: string | null,
): Promise<{ rows: SavedRow[]; ownCompetitorId: string | null }> {
  const selectCols =
    "id, name, brand_name, brand_domain, logo_url, brand_logo_url, slug, last_scraped_at, is_workspace_brand";
  const requested = brandId?.trim();

  if (requested && requested !== "default" && requested !== "_workspace") {
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("workspace_competitor_id")
      .eq("user_id", userId)
      .eq("id", requested)
      .maybeSingle();
    if (brandError) throw new Error(brandError.message);

    const { data: mappings, error: mappingError } = await supabase
      .from("brand_competitors")
      .select("competitor_id")
      .eq("user_id", userId)
      .eq("brand_id", requested);
    if (mappingError) throw new Error(mappingError.message);

    const ownCompetitorId = brand?.workspace_competitor_id ?? null;
    const ids = [
      ...(ownCompetitorId ? [ownCompetitorId] : []),
      ...(mappings ?? []).map((m) => m.competitor_id).filter(Boolean),
    ];

    if (ids.length === 0) return { rows: [], ownCompetitorId };

    const { data: rows, error } = await supabase
      .from("saved_competitors")
      .select(selectCols)
      .eq("user_id", userId)
      .in("id", [...new Set(ids)]);
    if (error) throw new Error(error.message);

    return {
      rows: ((rows ?? []) as SavedRow[]).map((row) => ({
        ...row,
        is_workspace_brand: row.id === ownCompetitorId,
      })),
      ownCompetitorId,
    };
  }

  const { data: rows, error } = await supabase
    .from("saved_competitors")
    .select(selectCols)
    .eq("user_id", userId)
    .order("is_workspace_brand", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  const ownCompetitorId = (rows ?? []).find((r) => r.is_workspace_brand)?.id ?? null;
  return { rows: (rows ?? []) as SavedRow[], ownCompetitorId };
}

async function loadEntityMetrics(
  supabase: SupabaseClient<Database>,
  userId: string,
  row: SavedRow,
  scoreByCompetitor: Map<string, number>,
): Promise<BenchmarkEntityMetrics> {
  const [fingerprint, { data: ads }] = await Promise.all([
    computeActiveAdsFingerprint(supabase, userId, row.id),
    supabase
      .from("scraped_ads")
      .select("platform, first_seen_at, last_seen_at, ai_extracted_angle")
      .eq("user_id", userId)
      .eq("competitor_id", row.id)
      .eq("is_active", true),
  ]);

  const platformsActive = Object.fromEntries(BENCHMARK_PLATFORMS.map((p) => [p, false])) as Record<
    BenchmarkPlatformId,
    boolean
  >;
  const angles = new Set<string>();
  const periodCutoff = Date.now() - NEW_ADS_PERIOD_DAYS * 86_400_000;
  let newAdsThisPeriod = 0;
  let newestFirstSeenMs = 0;

  for (const ad of (ads ?? []) as AdRow[]) {
    const pl = normalizePlatform(ad.platform);
    if (pl) platformsActive[pl] = true;
    const angle = ad.ai_extracted_angle?.trim();
    if (angle) angles.add(angle);
    const firstMs = Date.parse(ad.first_seen_at);
    if (Number.isFinite(firstMs)) {
      if (firstMs >= periodCutoff) newAdsThisPeriod += 1;
      if (firstMs > newestFirstSeenMs) newestFirstSeenMs = firstMs;
    }
  }

  const platformsActiveCount = BENCHMARK_PLATFORMS.filter((p) => platformsActive[p]).length;
  const creativeFreshnessDays =
    newestFirstSeenMs > 0 ? Math.max(0, Math.floor((Date.now() - newestFirstSeenMs) / 86_400_000)) : null;

  return {
    id: row.id,
    name: displayName(row),
    domain: displayDomain(row),
    logoUrl: row.logo_url?.trim() || null,
    brandLogoUrl: row.brand_logo_url?.trim() || null,
    isOwnBrand: row.is_workspace_brand,
    lastScrapedAt: row.last_scraped_at,
    fingerprint,
    activityScore: scoreByCompetitor.get(row.id) ?? null,
    activeAdCount: (ads ?? []).length,
    newAdsThisPeriod,
    platformsActive,
    platformsActiveCount,
    creativeFreshnessDays,
    extractedAngles: [...angles].sort((a, b) => a.localeCompare(b)),
  };
}

function deriveAngleGaps(own: BenchmarkEntityMetrics, rivals: BenchmarkEntityMetrics[]): string[] {
  const ownAngles = new Set(own.extractedAngles.map((a) => a.toLowerCase()));
  const rivalCounts = new Map<string, number>();

  for (const rival of rivals) {
    for (const angle of rival.extractedAngles) {
      const key = angle.trim();
      if (!key) continue;
      if (ownAngles.has(key.toLowerCase())) continue;
      rivalCounts.set(key, (rivalCounts.get(key) ?? 0) + 1);
    }
  }

  return [...rivalCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([angle]) => angle);
}

function derivePlatformOpportunities(own: BenchmarkEntityMetrics, rivals: BenchmarkEntityMetrics[]): BenchmarkPlatformId[] {
  return BENCHMARK_PLATFORMS.filter((pl) => {
    if (own.platformsActive[pl]) return false;
    const rivalCount = rivals.filter((r) => r.platformsActive[pl]).length;
    return rivalCount > 0;
  }).sort((a, b) => {
    const ca = rivals.filter((r) => r.platformsActive[a]).length;
    const cb = rivals.filter((r) => r.platformsActive[b]).length;
    return cb - ca;
  });
}

function buildBiggestGapLine(
  own: BenchmarkEntityMetrics,
  rivals: BenchmarkEntityMetrics[],
  platformOpportunities: BenchmarkPlatformId[],
): string {
  if (platformOpportunities.length > 0) {
    const top = platformOpportunities[0]!;
    const count = rivals.filter((r) => r.platformsActive[top]).length;
    const label = top.charAt(0).toUpperCase() + top.slice(1);
    if (count >= 2) {
      return `${count} competitors run ${label} ads — you don't.`;
    }
    return `A competitor runs ${label} ads — you don't.`;
  }

  const scores = [own, ...rivals].map((e) => e.activityScore).filter((s): s is number => s != null);
  if (own.activityScore != null && scores.length > 1) {
    const leader = Math.max(...scores);
    if (leader > own.activityScore + 8) {
      return `Activity score gap: you're at ${own.activityScore}, leader at ${leader}.`;
    }
  }

  if (own.newAdsThisPeriod === 0 && rivals.some((r) => r.newAdsThisPeriod >= 3)) {
    return "Competitors launched new ads this week — you haven't.";
  }

  return "You're tracking evenly on channels — focus on creative freshness and angles.";
}

function buildRecommendedMoves(
  own: BenchmarkEntityMetrics,
  rivals: BenchmarkEntityMetrics[],
  platformOpportunities: BenchmarkPlatformId[],
  angleGaps: string[],
): BenchmarkRecommendedMove[] {
  const moves: BenchmarkRecommendedMove[] = [];
  const rivalAvgFresh =
    avg(rivals.map((r) => r.creativeFreshnessDays).filter((d): d is number => d != null)) ?? null;

  if (platformOpportunities.length > 0) {
    const pl = platformOpportunities[0]!;
    const count = rivals.filter((r) => r.platformsActive[pl]).length;
    moves.push({
      title: `Explore ${pl.charAt(0).toUpperCase() + pl.slice(1)}`,
      detail:
        count >= 2
          ? `${count} of your competitors advertise on ${pl} — review their creatives in Ad Library.`
          : `A competitor is active on ${pl} — see what they're running.`,
      tab: "ads library",
      sub: "all",
    });
  }

  if (
    own.creativeFreshnessDays != null &&
    rivalAvgFresh != null &&
    own.creativeFreshnessDays > rivalAvgFresh + 7
  ) {
    moves.push({
      title: "Refresh creative",
      detail: `Your newest active ad is ${own.creativeFreshnessDays}d old vs ~${Math.round(rivalAvgFresh)}d for rivals — test new angles.`,
      tab: "ads library",
      sub: "all",
    });
  }

  if (angleGaps.length > 0) {
    const top = angleGaps.slice(0, 2).join(", ");
    moves.push({
      title: "Study competitor angles",
      detail: `Rivals lean on angles you're missing: ${top}.`,
      tab: "ads library",
      sub: "copy-vault",
    });
  }

  if (moves.length < 3) {
    moves.push({
      title: "Review activity feed",
      detail: "See what changed this week across your competitive set.",
      tab: "insights",
      sub: "activity-feed",
    });
  }

  return moves.slice(0, 3);
}

function buildFallbackAiSummary(
  own: BenchmarkEntityMetrics,
  rivals: BenchmarkEntityMetrics[],
  platformOpportunities: BenchmarkPlatformId[],
  angleGaps: string[],
): BenchmarkAiSummary {
  const winning: string[] = [];
  const behind: string[] = [];

  const avgRivalAds = avg(rivals.map((r) => r.activeAdCount)) ?? 0;
  if (own.activeAdCount >= avgRivalAds && own.activeAdCount > 0) {
    winning.push(`Active ad volume (${own.activeAdCount}) is at or above the group average.`);
  } else if (avgRivalAds > 0) {
    behind.push(`Fewer active ads (${own.activeAdCount}) than the group average (~${Math.round(avgRivalAds)}).`);
  }

  if (own.platformsActiveCount >= (avg(rivals.map((r) => r.platformsActiveCount)) ?? 0)) {
    winning.push(`Platform breadth: live on ${own.platformsActiveCount} of 6 channels.`);
  } else if (platformOpportunities.length > 0) {
    behind.push(`Only ${own.platformsActiveCount} of 6 platforms active — gaps on ${platformOpportunities.slice(0, 2).join(", ")}.`);
  }

  if (own.newAdsThisPeriod >= 2) {
    winning.push(`${own.newAdsThisPeriod} new ads in the last ${NEW_ADS_PERIOD_DAYS} days.`);
  } else if (rivals.some((r) => r.newAdsThisPeriod >= 3)) {
    behind.push("Competitors outpaced you on new launches this week.");
  }

  let biggestOpportunity = "Keep monitoring rivals and test one new angle this week.";
  if (platformOpportunities.length > 0) {
    biggestOpportunity = `Test ${platformOpportunities[0]} — competitors are there and you're not.`;
  } else if (angleGaps.length > 0) {
    biggestOpportunity = `Try the "${angleGaps[0]}" angle — rivals use it, you don't.`;
  }

  return {
    winning: winning.slice(0, 3),
    behind: behind.slice(0, 3),
    biggestOpportunity,
  };
}

export async function computeBenchmarkCombinedFingerprint(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId?: string | null,
): Promise<string> {
  const { rows } = await loadBenchmarkSavedRows(supabase, userId, brandId);
  const ids = rows.map((r) => r.id);
  if (!ids.length) return "";

  const fingerprints = await Promise.all(
    ids.map(async (id) => `${id}:${await computeActiveAdsFingerprint(supabase, userId, id)}`),
  );
  return buildCombinedFingerprint(fingerprints);
}

export async function buildBrandBenchmarkPayload(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  brandId?: string | null;
  skipLlm?: boolean;
}): Promise<{ payload: BenchmarkPayload; aiModel: string | null }> {
  const { supabase, userId, brandId, skipLlm = false } = params;

  const { rows, ownCompetitorId } = await loadBenchmarkSavedRows(supabase, userId, brandId);
  const ownRow = ownCompetitorId
    ? (rows ?? []).find((r) => r.id === ownCompetitorId) ?? null
    : (rows ?? []).find((r) => r.is_workspace_brand) ?? null;
  const rivalRows = (rows ?? []).filter((r) => r.id !== ownRow?.id);

  if (!ownRow) {
    throw new Error("Workspace brand not found");
  }

  const { data: scoreRows } = await supabase
    .from("competitor_activity_scores")
    .select("competitor_id, score")
    .eq("user_id", userId);

  const scoreByCompetitor = new Map<string, number>();
  for (const s of scoreRows ?? []) {
    if (typeof s.score === "number") scoreByCompetitor.set(s.competitor_id, s.score);
  }

  const allRows = [ownRow, ...rivalRows];
  const entities = await Promise.all(
    allRows.map((row) => loadEntityMetrics(supabase, userId, row as SavedRow, scoreByCompetitor)),
  );

  const ownBrand = entities.find((e) => e.isOwnBrand)!;
  const competitors = entities.filter((e) => !e.isOwnBrand);
  const combinedFingerprint = buildCombinedFingerprint(entities.map((e) => `${e.id}:${e.fingerprint}`));

  const platformOpportunities = derivePlatformOpportunities(ownBrand, competitors);
  const angleGaps = deriveAngleGaps(ownBrand, competitors);

  const activityScores = entities.map((e) => e.activityScore).filter((s): s is number => s != null);
  const activeAdCounts = entities.map((e) => e.activeAdCount);
  const platformCounts = entities.map((e) => e.platformsActiveCount);

  const activityRank = rankEntities(entities, (e) => e.activityScore, true);
  const adsRank = rankEntities(entities, (e) => e.activeAdCount, true);
  const platformRank = rankEntities(entities, (e) => e.platformsActiveCount, true);

  const ownActivityRank = activityRank.find((r) => r.entityId === ownBrand.id);
  const ownAdsRank = adsRank.find((r) => r.entityId === ownBrand.id);

  const leaderScore = activityScores.length ? Math.max(...activityScores) : null;
  const avgScore = avg(activityScores);
  const avgAds = avg(activeAdCounts) ?? 0;
  const avgPlatforms = avg(platformCounts) ?? 0;

  const ownStaleDays = daysSince(ownBrand.lastScrapedAt);
  const maxRivalAds = competitors.length ? Math.max(...competitors.map((c) => c.activeAdCount)) : 0;
  const ownBrandLowAdCount =
    maxRivalAds > 0 && ownBrand.activeAdCount < Math.max(3, Math.floor(maxRivalAds * LOW_AD_COUNT_RATIO));
  const ownBrandStale = ownStaleDays != null && ownStaleDays > STALE_OWN_BRAND_DAYS;
  const showBanner = ownBrandStale || ownBrandLowAdCount;

  let stalenessMessage: string | null = null;
  if (ownBrandStale && ownBrandLowAdCount) {
    stalenessMessage = `Your brand was last scraped ${ownStaleDays}d ago and has fewer ads than rivals — refresh for an accurate comparison.`;
  } else if (ownBrandStale) {
    stalenessMessage = `Your brand was last scraped ${ownStaleDays}d ago — refresh for an accurate comparison.`;
  } else if (ownBrandLowAdCount) {
    stalenessMessage = "Your brand has very few active ads vs competitors — refresh your workspace ads for a fair comparison.";
  }

  const metricsSummary = entities
    .map(
      (e) =>
        `${e.isOwnBrand ? "[YOU]" : "[RIVAL]"} ${e.name}: score=${e.activityScore ?? "n/a"}, activeAds=${e.activeAdCount}, newAds7d=${e.newAdsThisPeriod}, platforms=${e.platformsActiveCount}/6, freshnessDays=${e.creativeFreshnessDays ?? "n/a"}, angles=${e.extractedAngles.slice(0, 6).join("; ") || "none"}`,
    )
    .join("\n");

  let aiSummary = buildFallbackAiSummary(ownBrand, competitors, platformOpportunities, angleGaps);
  let aiModel: string | null = null;

  if (!skipLlm && competitors.length > 0) {
    const llm = await runBenchmarkLlm({
      userBrandName: ownBrand.name,
      metricsSummary,
      platformGaps: platformOpportunities,
      angleGaps,
    });
    if (llm.ok) {
      aiSummary = llm.result;
      aiModel = llm.model;
    }
  }

  const payload: BenchmarkPayload = {
    ok: true,
    computedAt: new Date().toISOString(),
    combinedFingerprint,
    fromCache: false,
    ownBrand,
    competitors,
    entities,
    hero: {
      activityScoreYou: ownBrand.activityScore,
      activityScoreAvg: avgScore,
      activityScoreLeader: leaderScore,
      activityScoreRankLabel: ownActivityRank ? `#${ownActivityRank.rank} of ${ownActivityRank.of}` : "—",
      activeAdsYou: ownBrand.activeAdCount,
      activeAdsAvg: Math.round(avgAds * 10) / 10,
      activeAdsRankLabel: ownAdsRank ? `#${ownAdsRank.rank} of ${ownAdsRank.of}` : "—",
      platformsYouLabel: `${ownBrand.platformsActiveCount} of 6`,
      platformsAvg: Math.round(avgPlatforms * 10) / 10,
      biggestGapLine: buildBiggestGapLine(ownBrand, competitors, platformOpportunities),
    },
    rankings: {
      activityScore: activityRank,
      activeAds: adsRank,
      platformsActive: platformRank,
    },
    platformOpportunities,
    angleGaps,
    aiSummary,
    recommendedMoves: buildRecommendedMoves(ownBrand, competitors, platformOpportunities, angleGaps),
    staleness: {
      showBanner,
      ownBrandStaleDays: ownStaleDays,
      ownBrandLowAdCount,
      message: stalenessMessage,
    },
  };

  return { payload, aiModel };
}
