import {
  ULTIMATE_WINNER_HIGH_BAND_MIN_DAYS,
  ULTIMATE_WINNER_HIGH_BAND_MIN_INDEX,
  ULTIMATE_WINNER_MIN_DAYS_RUNNING,
  ULTIMATE_WINNER_MIN_IMPRESSIONS_INDEX,
  ULTIMATE_WINNER_RUNTIME_ONLY_MIN_DAYS,
} from "@/lib/ad-library/ad-performance-ranking";
import type { DiscoveryPatternMetrics } from "./types";
import {
  DAY_MS,
  inUtcHalfOpenRange,
  parseUtcWeekStartYmd,
  startOfUtcWeekMonday,
  utcWeekStartYmd,
} from "./pattern-week-utils";

export type PatternMetricsAd = {
  id: string;
  competitor_id: string;
  competitor_name: string;
  format: string;
  ad_text: string;
  first_seen_at: string;
  last_seen_at: string;
  is_killed: boolean;
  days_running: number;
  impressions_index: number | null;
  is_ultimate_winner: boolean;
  ai_extracted_angle: string | null;
  ai_extracted_launch_date: string | null;
  landing_page_key: string | null;
};

function isVideoFormat(format: string | null | undefined): boolean {
  const f = (format ?? "").trim().toLowerCase();
  return f.includes("video") || f === "reel" || f === "carousel_video";
}

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function effectiveLaunchMs(ad: PatternMetricsAd): number | null {
  const launchRaw = ad.ai_extracted_launch_date?.trim();
  const launchMs = launchRaw ? Date.parse(launchRaw) : NaN;
  if (Number.isFinite(launchMs)) return launchMs;
  return parseMs(ad.first_seen_at);
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function wasActiveDuringWeek(ad: PatternMetricsAd, weekStartMs: number, weekEndMs: number): boolean {
  const launchMs = effectiveLaunchMs(ad);
  if (launchMs == null || launchMs >= weekEndMs) return false;
  if (!ad.is_killed) return true;
  const lastMs = parseMs(ad.last_seen_at);
  if (lastMs == null) return false;
  return lastMs >= weekStartMs;
}

function crossedUltimateWinnerThresholdThisWeek(
  ad: PatternMetricsAd,
  weekStartMs: number,
  weekEndMs: number,
): boolean {
  if (!ad.is_ultimate_winner) return false;
  const launchMs = effectiveLaunchMs(ad);
  if (launchMs == null) return false;

  let minDays = ULTIMATE_WINNER_RUNTIME_ONLY_MIN_DAYS;
  if (ad.impressions_index != null) {
    if (ad.impressions_index >= ULTIMATE_WINNER_HIGH_BAND_MIN_INDEX) {
      minDays = ULTIMATE_WINNER_HIGH_BAND_MIN_DAYS;
    } else if (ad.impressions_index >= ULTIMATE_WINNER_MIN_IMPRESSIONS_INDEX) {
      minDays = ULTIMATE_WINNER_MIN_DAYS_RUNNING;
    }
  }

  const crossedMs = launchMs + minDays * DAY_MS;
  return inUtcHalfOpenRange(crossedMs, weekStartMs, weekEndMs);
}

function buildWeeklySeries(
  ads: PatternMetricsAd[],
  weekStartMs: number,
  weeks = 8,
): DiscoveryPatternMetrics["weekly_series"] {
  const series: DiscoveryPatternMetrics["weekly_series"] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = weekStartMs - i * 7 * DAY_MS;
    const end = start + 7 * DAY_MS;
    let launches = 0;
    let retirements = 0;
    let activeTotal = 0;
    for (const ad of ads) {
      const launchMs = effectiveLaunchMs(ad);
      if (launchMs != null && inUtcHalfOpenRange(launchMs, start, end)) launches += 1;
      if (ad.is_killed) {
        const lastMs = parseMs(ad.last_seen_at);
        if (lastMs != null && inUtcHalfOpenRange(lastMs, start, end)) retirements += 1;
      }
      if (wasActiveDuringWeek(ad, start, end)) activeTotal += 1;
    }
    series.push({
      week_start: utcWeekStartYmd(start),
      launches,
      retirements,
      active_total: activeTotal,
    });
  }
  return series;
}

const EMPTY_METRICS = (weekStart: string): DiscoveryPatternMetrics => ({
  week_start: weekStart,
  total_ads: 0,
  active_ads: 0,
  new_this_week: 0,
  new_prev_week: 0,
  killed_this_week: 0,
  killed_prev_week: 0,
  net_change: 0,
  ultimate_winners_total: 0,
  new_ultimate_winners_this_week: 0,
  video_share_pct: 0,
  video_share_of_new_pct: 0,
  avg_impressions_index: null,
  median_run_days_of_killed: null,
  fast_kills_this_week: 0,
  unique_landing_pages: 0,
  weekly_series: [],
  competitors: [],
  format_mix: [
    { format: "video", active: 0, new_this_week: 0 },
    { format: "image", active: 0, new_this_week: 0 },
  ],
  angle_mix: [],
});

export function computeDiscoveryPatternMetrics(
  ads: PatternMetricsAd[],
  weekStartMs: number,
  nowMs = Date.now(),
): DiscoveryPatternMetrics {
  const weekStart = utcWeekStartYmd(weekStartMs);
  if (!ads.length) {
    return {
      ...EMPTY_METRICS(weekStart),
      weekly_series: buildWeeklySeries([], weekStartMs, 8),
    };
  }

  const thisWeekEnd = weekStartMs + 7 * DAY_MS;
  const prevWeekStart = weekStartMs - 7 * DAY_MS;

  let activeAds = 0;
  let newThisWeek = 0;
  let newPrevWeek = 0;
  let killedThisWeek = 0;
  let killedPrevWeek = 0;
  let ultimateWinnersTotal = 0;
  let newUltimateWinnersThisWeek = 0;
  let activeVideo = 0;
  let newVideo = 0;
  let newCount = 0;
  let impressionsSum = 0;
  let impressionsCount = 0;
  let fastKillsThisWeek = 0;
  const killedRunDays: number[] = [];
  const marketLandingKeys = new Set<string>();

  const competitorMap = new Map<
    string,
    {
      name: string;
      active: number;
      launched: number;
      killed: number;
      winners: number;
      videoActive: number;
      landingKeys: Set<string>;
    }
  >();
  type AngleStats = {
    count: number;
    ad_ids: string[];
    active_count: number;
    killed_count: number;
    new_this_week: number;
    killed_this_week: number;
  };
  const angleCounts = new Map<string, AngleStats>();

  for (const ad of ads) {
    if (!ad.is_killed) activeAds += 1;
    if (ad.is_ultimate_winner) ultimateWinnersTotal += 1;
    if (isVideoFormat(ad.format) && !ad.is_killed) activeVideo += 1;

    if (ad.impressions_index != null && Number.isFinite(ad.impressions_index)) {
      impressionsSum += ad.impressions_index;
      impressionsCount += 1;
    }

    const launchMs = effectiveLaunchMs(ad);
    const launchedThisWeek =
      launchMs != null && inUtcHalfOpenRange(launchMs, weekStartMs, thisWeekEnd);
    const launchedPrevWeek =
      launchMs != null && inUtcHalfOpenRange(launchMs, prevWeekStart, weekStartMs);

    if (launchedThisWeek) {
      newThisWeek += 1;
      newCount += 1;
      if (isVideoFormat(ad.format)) newVideo += 1;
    }
    if (launchedPrevWeek) newPrevWeek += 1;

    if (crossedUltimateWinnerThresholdThisWeek(ad, weekStartMs, thisWeekEnd)) {
      newUltimateWinnersThisWeek += 1;
    }

    if (ad.is_killed) {
      const lastMs = parseMs(ad.last_seen_at);
      if (lastMs != null && inUtcHalfOpenRange(lastMs, weekStartMs, thisWeekEnd)) {
        killedThisWeek += 1;
        killedRunDays.push(ad.days_running);
        if (ad.days_running <= 7) fastKillsThisWeek += 1;
      }
      if (lastMs != null && inUtcHalfOpenRange(lastMs, prevWeekStart, weekStartMs)) {
        killedPrevWeek += 1;
      }
    }

    const comp = competitorMap.get(ad.competitor_id) ?? {
      name: ad.competitor_name,
      active: 0,
      launched: 0,
      killed: 0,
      winners: 0,
      videoActive: 0,
      landingKeys: new Set<string>(),
    };
    if (ad.landing_page_key) {
      marketLandingKeys.add(ad.landing_page_key);
      comp.landingKeys.add(ad.landing_page_key);
    }
    if (!ad.is_killed) comp.active += 1;
    if (launchedThisWeek) comp.launched += 1;
    if (ad.is_killed) {
      const lastMs = parseMs(ad.last_seen_at);
      if (lastMs != null && inUtcHalfOpenRange(lastMs, weekStartMs, thisWeekEnd)) comp.killed += 1;
    }
    if (ad.is_ultimate_winner) comp.winners += 1;
    if (isVideoFormat(ad.format) && !ad.is_killed) comp.videoActive += 1;
    competitorMap.set(ad.competitor_id, comp);

    const angle = ad.ai_extracted_angle?.trim();
    if (angle && angle.toLowerCase() !== "unclassified") {
      const stats = angleCounts.get(angle) ?? {
        count: 0,
        ad_ids: [],
        active_count: 0,
        killed_count: 0,
        new_this_week: 0,
        killed_this_week: 0,
      };
      stats.count += 1;
      stats.ad_ids.push(ad.id);
      if (!ad.is_killed) stats.active_count += 1;
      else stats.killed_count += 1;
      if (launchedThisWeek) stats.new_this_week += 1;
      if (ad.is_killed) {
        const lastMs = parseMs(ad.last_seen_at);
        if (lastMs != null && inUtcHalfOpenRange(lastMs, weekStartMs, thisWeekEnd)) {
          stats.killed_this_week += 1;
        }
      }
      angleCounts.set(angle, stats);
    }
  }

  const competitors = [...competitorMap.entries()]
    .map(([competitor_id, c]) => ({
      competitor_id,
      name: c.name,
      active_ads: c.active,
      launched_this_week: c.launched,
      killed_this_week: c.killed,
      ultimate_winners: c.winners,
      video_share_pct: c.active > 0 ? Math.round((c.videoActive / c.active) * 100) : 0,
      unique_landing_pages: c.landingKeys.size,
      aggression_score: Math.round(c.launched * 2 + c.active / 10),
    }))
    .sort((a, b) => b.aggression_score - a.aggression_score || a.name.localeCompare(b.name));

  const angle_mix = [...angleCounts.entries()]
    .map(([angle, stats]) => ({
      angle,
      count: stats.count,
      ad_ids: stats.ad_ids,
      active_count: stats.active_count,
      killed_count: stats.killed_count,
      new_this_week: stats.new_this_week,
      killed_this_week: stats.killed_this_week,
    }))
    .sort((a, b) => b.count - a.count || a.angle.localeCompare(b.angle))
    .slice(0, 8);

  const activeImage = Math.max(0, activeAds - activeVideo);
  const newImage = Math.max(0, newCount - newVideo);

  return {
    week_start: weekStart,
    total_ads: ads.length,
    active_ads: activeAds,
    new_this_week: newThisWeek,
    new_prev_week: newPrevWeek,
    killed_this_week: killedThisWeek,
    killed_prev_week: killedPrevWeek,
    net_change: newThisWeek - killedThisWeek,
    ultimate_winners_total: ultimateWinnersTotal,
    new_ultimate_winners_this_week: newUltimateWinnersThisWeek,
    video_share_pct: activeAds > 0 ? Math.round((activeVideo / activeAds) * 100) : 0,
    video_share_of_new_pct: newCount > 0 ? Math.round((newVideo / newCount) * 100) : 0,
    avg_impressions_index:
      impressionsCount > 0 ? Math.round((impressionsSum / impressionsCount) * 10) / 10 : null,
    median_run_days_of_killed: median(killedRunDays),
    fast_kills_this_week: fastKillsThisWeek,
    unique_landing_pages: marketLandingKeys.size,
    weekly_series: buildWeeklySeries(ads, weekStartMs, 8),
    competitors,
    format_mix: [
      { format: "video", active: activeVideo, new_this_week: newVideo },
      { format: "image", active: activeImage, new_this_week: newImage },
    ],
    angle_mix,
  };
}

export function resolvePatternWeekStartMs(nowMs = Date.now()): number {
  return startOfUtcWeekMonday(nowMs);
}

export function resolvePatternWeekStartYmd(nowMs = Date.now()): string {
  return utcWeekStartYmd(nowMs);
}

export function parsePatternWeekStartMs(weekStart: string): number {
  return parseUtcWeekStartYmd(weekStart);
}
