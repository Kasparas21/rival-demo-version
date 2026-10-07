import type { ScrapedAdForActivityScore } from "../types";

function isVideoish(ad: ScrapedAdForActivityScore): boolean {
  const f = ad.format.trim().toLowerCase();
  if (f.includes("video") || f.includes("reel")) return true;
  const u = (ad.ad_creative_url ?? "").toLowerCase();
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return true;
  if (!ad.raw_payload || typeof ad.raw_payload !== "object" || Array.isArray(ad.raw_payload)) {
    return false;
  }
  const r = ad.raw_payload as Record<string, unknown>;
  if (typeof r.videoUrl === "string" && r.videoUrl.trim()) return true;
  if (typeof r.video_url === "string" && r.video_url.trim()) return true;
  return false;
}

export function videoRatioScore(videoRatio: number): number {
  if (videoRatio <= 0.2) return 15;
  if (videoRatio <= 0.5) return 40;
  if (videoRatio <= 0.8) return 70;
  return 95;
}

/** Platforms where an advertiser chooses between video and static creative. Search/text ads are not. */
const VIDEO_CHOICE_PLATFORMS = new Set(["meta", "facebook", "instagram", "tiktok", "snapchat", "pinterest", "linkedin"]);

/**
 * Video share on social platforms. Returns null when the advertiser runs nothing there (e.g. Google
 * search only): the signal then doesn't apply, instead of scoring every text advertiser 15/100.
 */
export function computeProductionValueHeuristic(ads: ScrapedAdForActivityScore[]): {
  score: number;
  videoRatio: number;
} | null {
  const social = ads.filter((a) => VIDEO_CHOICE_PLATFORMS.has(a.platform.trim().toLowerCase()));
  if (social.length === 0) return null;
  let v = 0;
  for (const a of social) {
    if (isVideoish(a)) v += 1;
  }
  const videoRatio = v / social.length;
  return { score: videoRatioScore(videoRatio), videoRatio };
}
