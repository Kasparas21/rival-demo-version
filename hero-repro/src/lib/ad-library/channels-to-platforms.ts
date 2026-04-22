import type { ChannelId } from "@/components/channel-picker-modal";
import type { AdsLibraryPlatform } from "./api-types";

/** Platforms called via Apify in `/api/ads/library`. */
export const ALL_ADS_API_PLATFORMS: AdsLibraryPlatform[] = [
  "meta",
  "google",
  "linkedin",
  "tiktok",
  "microsoft",
  "pinterest",
];

/**
 * Map UI channel picker ids → ads-library API platforms.
 * YouTube uses the same Google Transparency / Apify Google actor as Google ads.
 */
const CHANNEL_TO_ADS_PLATFORMS: Partial<Record<ChannelId, AdsLibraryPlatform[]>> = {
  meta: ["meta"],
  google: ["google"],
  youtube: ["google"],
  tiktok: ["tiktok"],
  linkedin: ["linkedin"],
  microsoft: ["microsoft"],
  pinterest: ["pinterest"],
};

/**
 * @param channelIds — from `?channels=meta,google,linkedin,tiktok` (comma-separated)
 * @returns Unique list of API platforms to request
 */
export function channelsQueryToAdsPlatforms(channelIds: string[]): AdsLibraryPlatform[] {
  const set = new Set<AdsLibraryPlatform>();
  for (const raw of channelIds) {
    const id = raw.trim() as ChannelId;
    const mapped = CHANNEL_TO_ADS_PLATFORMS[id];
    if (mapped) {
      for (const p of mapped) set.add(p);
    }
  }
  return ALL_ADS_API_PLATFORMS.filter((p) => set.has(p));
}
