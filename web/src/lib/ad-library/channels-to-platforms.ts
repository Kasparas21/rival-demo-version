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

function platformHasFilledId(platform: AdsLibraryPlatform, ids: Record<string, string>): boolean {
  const pick = (key: string) => {
    const v = ids[key];
    return typeof v === "string" && v.trim().length > 0;
  };
  switch (platform) {
    case "meta":
      return pick("meta") || pick("metaPageUrl");
    case "google":
      return pick("google");
    case "linkedin":
      return pick("linkedin");
    case "tiktok":
      return pick("tiktok");
    case "pinterest":
      return pick("pinterest") || pick("pinterestAdvertiserName");
    case "snapchat":
      return pick("snapchat");
    default:
      return false;
  }
}

/**
 * Platforms to load on the competitor dashboard — never defaults to “all six” when selection is unknown
 * (that caused cache-miss Apify runs for LinkedIn, Pinterest, etc. after revisiting on another device).
 */
export function resolveAdsPlatformsForCompetitorView(
  channelsCsv: string,
  ids: Record<string, string> | null | undefined
): AdsLibraryPlatform[] {
  const trimmed = channelsCsv.trim();
  if (trimmed) {
    return channelsQueryToAdsPlatforms(trimmed.split(","));
  }
  if (ids && Object.keys(ids).length > 0) {
    const fromIds = ALL_ADS_API_PLATFORMS.filter((p) => platformHasFilledId(p, ids));
    if (fromIds.length > 0) return fromIds;
  }
  return ALL_ADS_API_PLATFORMS;
}

/** Merge multiple channel/id sources without dropping platforms from an earlier scrape or onboarding setup. */
export function unionAdsPlatformsFromSources(
  ...sources: { channelsCsv?: string; ids?: Record<string, string> | null | undefined }[]
): AdsLibraryPlatform[] {
  const set = new Set<AdsLibraryPlatform>();
  for (const src of sources) {
    for (const platform of resolveAdsPlatformsForCompetitorView(src.channelsCsv ?? "", src.ids)) {
      set.add(platform);
    }
  }
  return ALL_ADS_API_PLATFORMS.filter((p) => set.has(p));
}
