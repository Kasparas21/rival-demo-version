import type { InitialScrapePlatform } from "@/lib/ad-library/constants";

/** Platforms scraped within this window count as "just refreshed" for join/session toasts. */
export const RECENT_PLATFORM_REFRESH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const PLATFORM_LABELS: Record<InitialScrapePlatform, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

export function platformRefreshLabel(platform: string): string {
  const key = platform.trim().toLowerCase() as InitialScrapePlatform;
  return PLATFORM_LABELS[key] ?? platform;
}

export function isRecentlyScrapedAt(
  lastScrapeAt: string | null | undefined,
  nowMs = Date.now(),
  maxAgeMs = RECENT_PLATFORM_REFRESH_MAX_AGE_MS,
): boolean {
  if (!lastScrapeAt?.trim()) return false;
  const t = Date.parse(lastScrapeAt);
  if (Number.isNaN(t)) return false;
  const age = nowMs - t;
  return age >= 0 && age <= maxAgeMs;
}

/** "Meta and Google" / "Meta, Google, and TikTok" */
export function formatPlatformList(labels: string[]): string {
  const unique = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0]!;
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

export function buildRecentPlatformRefreshMessage(params: {
  platforms: string[];
  competitorName?: string | null;
}): string | null {
  const labels = params.platforms.map(platformRefreshLabel).filter(Boolean);
  const list = formatPlatformList(labels);
  if (!list) return null;

  const name = params.competitorName?.trim();
  if (name) {
    return `${list} ${labels.length === 1 ? "has" : "have"} just refreshed for ${name} — you're up to date.`;
  }
  return `${list} ${labels.length === 1 ? "has" : "have"} just refreshed — you're up to date.`;
}

export const RECENT_REFRESH_NOTICE_SESSION_KEY = "rival_recent_refresh_notice_shown";

export function recentRefreshNoticeStorageKey(competitorId: string): string {
  return `${RECENT_REFRESH_NOTICE_SESSION_KEY}:${competitorId}`;
}
