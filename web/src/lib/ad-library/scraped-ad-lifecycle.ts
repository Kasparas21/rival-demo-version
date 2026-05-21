/** Aligns with ad-detail `is_killed` (last_seen vs competitor last_scraped_at − 24h). */

const KILLED_RECENCY_MS = 24 * 60 * 60 * 1000;

export function isScrapedAdKilled(
  lastSeenAt: string | null | undefined,
  lastScrapedAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  const lastSeenMs = lastSeenAt?.trim() ? Date.parse(lastSeenAt.trim()) : Number.NaN;
  if (!Number.isFinite(lastSeenMs)) return true;

  const lastScrapedMs = lastScrapedAt?.trim() ? Date.parse(lastScrapedAt.trim()) : Number.NaN;
  const anchorMs = Number.isFinite(lastScrapedMs) ? lastScrapedMs : nowMs;
  const killedThreshold = anchorMs - KILLED_RECENCY_MS;
  return lastSeenMs < killedThreshold;
}

export function isScrapedAdRunning(
  lastSeenAt: string | null | undefined,
  lastScrapedAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  return !isScrapedAdKilled(lastSeenAt, lastScrapedAt, nowMs);
}
