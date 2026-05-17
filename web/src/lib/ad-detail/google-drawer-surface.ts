import type { ComparisonPlatformIconId } from "@/components/comparison/platform-icon";
import { normalizeAdDetailPlatformKey } from "@/lib/ad-detail/ad-detail-platform";

/** YouTube Transparency creative: prefer icon when yt id appears on payload or platform tag. */
export function googleFamilyDrawerIsYoutubeish(platform: string, rawPayload: unknown): boolean {
  const pl = normalizeAdDetailPlatformKey(platform.trim());
  if (pl === "youtube") return true;
  if (pl !== "google") return false;
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return false;
  const y = (rawPayload as Record<string, unknown>).youtubeVideoId;
  return typeof y === "string" && y.trim().length > 0;
}

export function drawerComparisonPlatformIconId(
  platform: string,
  rawPayload: unknown
): ComparisonPlatformIconId {
  const pl = normalizeAdDetailPlatformKey(platform.trim());

  if (pl === "google" || pl === "youtube") {
    return googleFamilyDrawerIsYoutubeish(platform, rawPayload) ? "youtube" : "google";
  }

  if (
    pl === "meta" ||
    pl === "tiktok" ||
    pl === "linkedin" ||
    pl === "pinterest" ||
    pl === "snapchat"
  ) {
    return pl;
  }
  return "meta";
}

/** Lowercase slug for CSS `capitalize` (e.g. youtube → Youtube in the UI chip). */
export function drawerPlatformChipSlug(platform: string, rawPayload: unknown): string {
  const pl = normalizeAdDetailPlatformKey(platform.trim());
  if (googleFamilyDrawerIsYoutubeish(platform, rawPayload)) return "youtube";
  return pl;
}
