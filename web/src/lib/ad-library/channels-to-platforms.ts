import type { ChannelId } from "@/components/channel-picker-modal";
import type { AdsLibraryPlatform } from "./api-types";

/** Platforms callable via Apify in `/api/ads/library` (aligned with the channel picker where applicable). */
export const ALL_ADS_API_PLATFORMS: AdsLibraryPlatform[] = [
  "meta",
  "google",
  "linkedin",
  "tiktok",
  "pinterest",
  "snapchat",
];
/** `microsoft` exists on the ads-library API actor but is intentionally omitted here until it is added to `CHANNELS`. */

/** Map UI channel picker ids → ads-library API platforms. */
const CHANNEL_TO_ADS_PLATFORMS: Partial<Record<ChannelId, AdsLibraryPlatform[]>> = {
  meta: ["meta"],
  google: ["google"],
  tiktok: ["tiktok"],
  linkedin: ["linkedin"],
  pinterest: ["pinterest"],
  snapchat: ["snapchat"],
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
