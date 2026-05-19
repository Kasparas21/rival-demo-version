import type { InitialScrapePlatform } from "./constants";
import {
  CLASSIFICATION_REVIEW_INTERVAL_DAYS,
  HIGH_COVERAGE_ACTIVE_THRESHOLD,
  HIGH_COVERAGE_MIN_PLATFORMS,
  INACTIVE_PROBE_ADS_PER_PLATFORM,
  INACTIVE_PROBE_INTERVAL_DAYS,
  MINIMAL_REFRESH_INTERVAL_DAYS,
  PRIMARY_SECONDARY_REFRESH_INTERVAL_DAYS,
  REFRESH_ADS_PER_PLATFORM,
} from "./constants";
import type { ActiveAdCounts } from "./count-active-ads";
import { ALL_ADS_API_PLATFORMS } from "./channels-to-platforms";

export type PlatformClassification = "PRIMARY" | "SECONDARY" | "MINIMAL" | "INACTIVE";

export type PlatformTrackingResult = {
  platform: InitialScrapePlatform;
  activeAdCount: number;
  classification: PlatformClassification;
  highCoverageDemoted: boolean;
};

export type ComputePlatformTrackingResult = {
  platforms: PlatformTrackingResult[];
  highCoverageApplied: boolean;
};

export function classifyByActiveCount(activeCount: number): PlatformClassification {
  if (activeCount === 0) return "INACTIVE";
  if (activeCount <= 9) return "MINIMAL";
  if (activeCount <= 49) return "SECONDARY";
  return "PRIMARY";
}

export function refreshIntervalDaysForClassification(
  platform: InitialScrapePlatform,
  classification: PlatformClassification
): number {
  if (classification === "INACTIVE") return INACTIVE_PROBE_INTERVAL_DAYS;
  const table =
    classification === "MINIMAL"
      ? MINIMAL_REFRESH_INTERVAL_DAYS
      : PRIMARY_SECONDARY_REFRESH_INTERVAL_DAYS;
  return table[platform];
}

export function computeNextScrapeAt(
  platform: InitialScrapePlatform,
  classification: PlatformClassification,
  fromMs = Date.now()
): string {
  const days = refreshIntervalDaysForClassification(platform, classification);
  return new Date(fromMs + days * 86_400_000).toISOString();
}

function normalizeActiveCounts(counts: ActiveAdCounts): Record<InitialScrapePlatform, number> {
  const out = {} as Record<InitialScrapePlatform, number>;
  for (const p of ALL_ADS_API_PLATFORMS) {
    if (p === "microsoft") continue;
    out[p] = counts[p] ?? 0;
  }
  return out;
}

/** Classify each platform; apply high-coverage top-3 demotion when 5+ platforms have 30+ ads. */
export function computePlatformTracking(activeCounts: ActiveAdCounts): ComputePlatformTrackingResult {
  const normalized = normalizeActiveCounts(activeCounts);

  let platforms: PlatformTrackingResult[] = (
    Object.keys(normalized) as InitialScrapePlatform[]
  ).map((platform) => {
    const activeAdCount = normalized[platform];
    return {
      platform,
      activeAdCount,
      classification: classifyByActiveCount(activeAdCount),
      highCoverageDemoted: false,
    };
  });

  const highCoverageCount = platforms.filter(
    (p) => p.activeAdCount >= HIGH_COVERAGE_ACTIVE_THRESHOLD,
  ).length;
  const highCoverageApplied = highCoverageCount >= HIGH_COVERAGE_MIN_PLATFORMS;

  if (highCoverageApplied) {
    const sorted = [...platforms].sort((a, b) => b.activeAdCount - a.activeAdCount);
    const top3 = new Set(sorted.slice(0, 3).map((p) => p.platform));
    platforms = platforms.map((p) => {
      if (top3.has(p.platform) || p.classification === "INACTIVE") {
        return p;
      }
      return { ...p, highCoverageDemoted: true };
    });
  }

  return { platforms, highCoverageApplied };
}

/** When Smart Prioritization is disabled for a competitor, skip demoted platforms in cron. */
export function platformsEligibleForScheduledScrape(
  rows: {
    platform: string;
    classification: PlatformClassification;
    next_scrape_at: string | null;
    high_coverage_demoted?: boolean;
  }[],
  smartPrioritizationDisabled: boolean,
  nowMs = Date.now(),
): InitialScrapePlatform[] {
  const due = platformsDueForScrape(rows, nowMs);
  if (!smartPrioritizationDisabled) {
    return due;
  }
  const demoted = new Set(
    rows.filter((r) => r.high_coverage_demoted).map((r) => r.platform as InitialScrapePlatform),
  );
  return due.filter((p) => !demoted.has(p));
}

export function isClassificationReviewDue(
  lastReviewAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!lastReviewAt?.trim()) return true;
  const t = Date.parse(lastReviewAt);
  if (Number.isNaN(t)) return true;
  return nowMs - t >= CLASSIFICATION_REVIEW_INTERVAL_DAYS * 86_400_000;
}

/** Re-evaluate classification from fresh active counts (30-day review rules use same thresholds). */
export function reclassifyPlatform(
  _previous: PlatformClassification,
  activeAdCount: number
): PlatformClassification {
  return classifyByActiveCount(activeAdCount);
}

export function scrapeLimitForClassification(
  classification: PlatformClassification,
  opts?: { isInactiveProbe?: boolean }
): number {
  if (classification === "INACTIVE" || opts?.isInactiveProbe) {
    return INACTIVE_PROBE_ADS_PER_PLATFORM;
  }
  return REFRESH_ADS_PER_PLATFORM;
}

export function platformsDueForScrape(
  rows: {
    platform: string;
    classification: PlatformClassification;
    next_scrape_at: string | null;
  }[],
  nowMs = Date.now()
): InitialScrapePlatform[] {
  const due: InitialScrapePlatform[] = [];
  for (const row of rows) {
    const pl = row.platform as InitialScrapePlatform;
    if (!row.next_scrape_at) {
      due.push(pl);
      continue;
    }
    const t = Date.parse(row.next_scrape_at);
    if (Number.isNaN(t) || t <= nowMs) due.push(pl);
  }
  return due;
}
