export const AD_LIBRARY_VELOCITY_PLATFORMS = [
  "meta",
  "google",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
] as const;

export type AdLibraryVelocityPlatform = (typeof AD_LIBRARY_VELOCITY_PLATFORMS)[number];

export type PlatformVelocityRow = {
  platform: string;
  latest_ad_first_seen_at: string | null;
  days_since_latest: number | null;
  active_count: number;
  total_count: number;
};

type AdRow = { platform: string; first_seen_at: string; last_seen_at: string };

export function computePlatformVelocitiesFromScrapedRows(
  rows: AdRow[],
  lastScrapedAtMs: number,
  nowMs: number = Date.now()
): PlatformVelocityRow[] {
  const killedThreshold = lastScrapedAtMs - 24 * 60 * 60 * 1000;
  const byPlatform = new Map<string, { latest: number | null; activeCount: number; totalCount: number }>();
  for (const platform of AD_LIBRARY_VELOCITY_PLATFORMS) {
    byPlatform.set(platform, { latest: null, activeCount: 0, totalCount: 0 });
  }
  for (const ad of rows) {
    const entry = byPlatform.get(ad.platform);
    if (!entry) continue;
    entry.totalCount += 1;
    const firstSeenMs = new Date(ad.first_seen_at).getTime();
    const lastSeenMs = new Date(ad.last_seen_at).getTime();
    const isActive = lastSeenMs >= killedThreshold;
    if (isActive) {
      entry.activeCount += 1;
      if (entry.latest === null || firstSeenMs > entry.latest) {
        entry.latest = firstSeenMs;
      }
    }
  }
  return AD_LIBRARY_VELOCITY_PLATFORMS.map((platform) => {
    const entry = byPlatform.get(platform)!;
    const daysSince =
      entry.latest !== null
        ? Math.max(0, Math.floor((nowMs - entry.latest) / (24 * 60 * 60 * 1000)))
        : null;
    return {
      platform,
      latest_ad_first_seen_at: entry.latest !== null ? new Date(entry.latest).toISOString() : null,
      days_since_latest: daysSince,
      active_count: entry.activeCount,
      total_count: entry.totalCount,
    };
  });
}
