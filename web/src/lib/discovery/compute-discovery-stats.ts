import type { PatternMetricsAd } from "./compute-pattern-metrics";
import type {
  DiscoveryStatsCompetitorRow,
  DiscoveryStatsDto,
  DiscoveryStatsHighlight,
  DiscoveryStatsRangeMeta,
} from "./types";
import { inStatsRange, type DiscoveryStatsRange } from "./discovery-stats-range";

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

function launchedInRange(ad: PatternMetricsAd, range: DiscoveryStatsRange): boolean {
  const launchMs = effectiveLaunchMs(ad);
  return launchMs != null && inStatsRange(launchMs, range);
}

function killedInRange(ad: PatternMetricsAd, range: DiscoveryStatsRange): boolean {
  if (!ad.is_killed) return false;
  const lastMs = parseMs(ad.last_seen_at);
  return lastMs != null && inStatsRange(lastMs, range);
}

/** Ad run window overlaps the stats period (was live at least once in range). */
export function wasRunningInStatsRange(ad: PatternMetricsAd, range: DiscoveryStatsRange): boolean {
  if (range.dateFrom === "all") return true;

  const launchMs = effectiveLaunchMs(ad);
  if (launchMs == null || launchMs > range.endMs) return false;

  if (!ad.is_killed) return true;

  const lastMs = parseMs(ad.last_seen_at);
  return lastMs != null && lastMs >= range.startMs;
}

function topBy<T>(items: T[], pick: (item: T) => number, name: (item: T) => string): T | null {
  if (!items.length) return null;
  return [...items].sort((a, b) => pick(b) - pick(a) || name(a).localeCompare(name(b)))[0] ?? null;
}

export function computeDiscoveryStats(
  ads: PatternMetricsAd[],
  range: DiscoveryStatsRange,
  competitorMeta: Map<
    string,
    { domain: string | null; logo_url: string | null }
  >,
): DiscoveryStatsDto {
  const emptyHighlights: DiscoveryStatsHighlight[] = [];
  const rangeMeta: DiscoveryStatsRangeMeta = {
    label: range.label,
    date_from: range.dateFrom,
    date_to: range.dateTo,
    start_ms: range.startMs,
    end_ms: range.endMs,
  };

  if (!ads.length) {
    return {
      range: rangeMeta,
      market: {
        total_ads: 0,
        active_ads: 0,
        launched_in_period: 0,
        killed_in_period: 0,
        net_change: 0,
        ultimate_winners: 0,
        video_share_pct: 0,
        avg_impressions_index: null,
        fast_kills_in_period: 0,
        unique_landing_pages: 0,
      },
      highlights: emptyHighlights,
      competitors: [],
      longest_running: [],
    };
  }

  let activeAds = 0;
  let launchedInPeriod = 0;
  let killedInPeriod = 0;
  let ultimateWinners = 0;
  let activeVideo = 0;
  let impressionsSum = 0;
  let impressionsCount = 0;
  let fastKills = 0;
  const marketLandingKeys = new Set<string>();

  const competitorMap = new Map<
    string,
    {
      name: string;
      domain: string | null;
      logo_url: string | null;
      active: number;
      launched: number;
      killed: number;
      winners: number;
      videoActive: number;
      totalDaysRunning: number;
      longestDays: number;
      longestAdId: string | null;
      landingKeys: Set<string>;
    }
  >();

  let globalLongest: PatternMetricsAd | null = null;

  for (const ad of ads) {
    if (!ad.is_killed) activeAds += 1;
    if (ad.is_ultimate_winner) ultimateWinners += 1;
    if (isVideoFormat(ad.format) && !ad.is_killed) activeVideo += 1;

    if (ad.impressions_index != null && Number.isFinite(ad.impressions_index)) {
      impressionsSum += ad.impressions_index;
      impressionsCount += 1;
    }

    const launched = launchedInRange(ad, range);
    const killed = killedInRange(ad, range);
    if (launched) launchedInPeriod += 1;
    if (killed) {
      killedInPeriod += 1;
      if (ad.days_running <= 7) fastKills += 1;
    }

    if (!globalLongest || ad.days_running > globalLongest.days_running) {
      globalLongest = ad;
    }

    const runningInPeriod = wasRunningInStatsRange(ad, range);
    if (runningInPeriod && ad.landing_page_key) {
      marketLandingKeys.add(ad.landing_page_key);
    }

    const meta = competitorMeta.get(ad.competitor_id);
    const comp = competitorMap.get(ad.competitor_id) ?? {
      name: ad.competitor_name,
      domain: meta?.domain ?? null,
      logo_url: meta?.logo_url ?? null,
      active: 0,
      launched: 0,
      killed: 0,
      winners: 0,
      videoActive: 0,
      totalDaysRunning: 0,
      longestDays: 0,
      longestAdId: null,
      landingKeys: new Set<string>(),
    };

    if (runningInPeriod && ad.landing_page_key) {
      comp.landingKeys.add(ad.landing_page_key);
    }

    if (!ad.is_killed) {
      comp.active += 1;
      comp.totalDaysRunning += ad.days_running;
    }
    if (launched) comp.launched += 1;
    if (killed) comp.killed += 1;
    if (ad.is_ultimate_winner) comp.winners += 1;
    if (isVideoFormat(ad.format) && !ad.is_killed) comp.videoActive += 1;
    if (ad.days_running > comp.longestDays) {
      comp.longestDays = ad.days_running;
      comp.longestAdId = ad.id;
    }

    competitorMap.set(ad.competitor_id, comp);
  }

  const competitors: DiscoveryStatsCompetitorRow[] = [...competitorMap.entries()]
    .map(([competitor_id, c]) => ({
      competitor_id,
      name: c.name,
      domain: c.domain,
      logo_url: c.logo_url,
      active_ads: c.active,
      launched_in_period: c.launched,
      killed_in_period: c.killed,
      net_change: c.launched - c.killed,
      ultimate_winners: c.winners,
      video_share_pct: c.active > 0 ? Math.round((c.videoActive / c.active) * 100) : 0,
      total_days_running: c.totalDaysRunning,
      avg_days_running: c.active > 0 ? Math.round(c.totalDaysRunning / c.active) : 0,
      longest_ad_days: c.longestDays,
      longest_ad_id: c.longestAdId,
      unique_landing_pages: c.landingKeys.size,
      aggression_score: Math.round(c.launched * 2 + c.active / 10),
    }))
    .sort((a, b) => b.aggression_score - a.aggression_score || a.name.localeCompare(b.name));

  const longest_running = [...ads]
    .sort((a, b) => b.days_running - a.days_running || a.competitor_name.localeCompare(b.competitor_name))
    .slice(0, 10)
    .map((ad) => ({
      ad_id: ad.id,
      competitor_id: ad.competitor_id,
      competitor_name: ad.competitor_name,
      days_running: ad.days_running,
      preview: ad.ad_text.trim().slice(0, 120) || "No ad copy",
      is_ultimate_winner: ad.is_ultimate_winner,
      impressions_index: ad.impressions_index,
    }));

  const compRows = competitors;
  const mostLaunches = topBy(compRows, (c) => c.launched_in_period, (c) => c.name);
  const mostKills = topBy(compRows, (c) => c.killed_in_period, (c) => c.name);
  const mostActive = topBy(compRows, (c) => c.active_ads, (c) => c.name);
  const mostWinners = topBy(compRows, (c) => c.ultimate_winners, (c) => c.name);
  const mostRuntime = topBy(compRows, (c) => c.total_days_running, (c) => c.name);
  const longestCompetitor = topBy(compRows, (c) => c.longest_ad_days, (c) => c.name);
  const mostLandingPages = topBy(compRows, (c) => c.unique_landing_pages, (c) => c.name);

  const highlights: DiscoveryStatsHighlight[] = [
    {
      id: "launched",
      label: "Launched in period",
      value: launchedInPeriod.toLocaleString(),
      hint: mostLaunches ? `${mostLaunches.name} leads with ${mostLaunches.launched_in_period}` : undefined,
      drilldown: { kind: "launched" },
    },
    {
      id: "killed",
      label: "Turned off in period",
      value: killedInPeriod.toLocaleString(),
      hint: mostKills ? `${mostKills.name} retired ${mostKills.killed_in_period}` : undefined,
      drilldown: { kind: "killed" },
    },
    {
      id: "net",
      label: "Net change",
      value: `${launchedInPeriod - killedInPeriod >= 0 ? "+" : ""}${launchedInPeriod - killedInPeriod}`,
      hint: `${activeAds.toLocaleString()} still active`,
      drilldown: { kind: "active" },
    },
    {
      id: "winners",
      label: "Ultimate winners",
      value: ultimateWinners.toLocaleString(),
      hint: mostWinners ? `${mostWinners.name} has ${mostWinners.ultimate_winners}` : undefined,
      drilldown: { kind: "ultimate_winners" },
    },
    {
      id: "longest",
      label: "Longest running ad",
      value: globalLongest ? `${globalLongest.days_running}d` : "—",
      hint: globalLongest ? globalLongest.competitor_name : undefined,
      drilldown: globalLongest
        ? { kind: "single_ad", ad_id: globalLongest.id }
        : { kind: "longest_running" },
    },
    {
      id: "runtime",
      label: "Most combined runtime",
      value: mostRuntime ? `${mostRuntime.total_days_running.toLocaleString()}d` : "—",
      hint: mostRuntime?.name,
      drilldown: mostRuntime
        ? { kind: "competitor_active", competitor_id: mostRuntime.competitor_id }
        : { kind: "active" },
    },
    {
      id: "fast_kills",
      label: "Fast kills (≤7d)",
      value: fastKills.toLocaleString(),
      hint: "Retired within a week of launch",
      drilldown: { kind: "fast_kills" },
    },
    {
      id: "active_leader",
      label: "Most active ads",
      value: mostActive ? mostActive.active_ads.toLocaleString() : "—",
      hint: mostActive?.name,
      drilldown: mostActive
        ? { kind: "competitor_active", competitor_id: mostActive.competitor_id }
        : { kind: "active" },
    },
    {
      id: "landing_pages",
      label: "Active landing pages",
      value: marketLandingKeys.size.toLocaleString(),
      hint: mostLandingPages
        ? `${mostLandingPages.name} ran ${mostLandingPages.unique_landing_pages} in period`
        : "Distinct URLs on ads running in period",
      drilldown: { kind: "active" },
    },
  ];

  if (longestCompetitor?.longest_ad_id) {
    highlights.push({
      id: "longest_brand",
      label: "Longest ad by brand",
      value: `${longestCompetitor.longest_ad_days}d`,
      hint: longestCompetitor.name,
      drilldown: {
        kind: "single_ad",
        ad_id: longestCompetitor.longest_ad_id,
      },
    });
  }

  return {
    range: rangeMeta,
    market: {
      total_ads: ads.length,
      active_ads: activeAds,
      launched_in_period: launchedInPeriod,
      killed_in_period: killedInPeriod,
      net_change: launchedInPeriod - killedInPeriod,
      ultimate_winners: ultimateWinners,
      video_share_pct: activeAds > 0 ? Math.round((activeVideo / activeAds) * 100) : 0,
      avg_impressions_index:
        impressionsCount > 0 ? Math.round((impressionsSum / impressionsCount) * 10) / 10 : null,
      fast_kills_in_period: fastKills,
      unique_landing_pages: marketLandingKeys.size,
    },
    highlights,
    competitors,
    longest_running,
  };
}
