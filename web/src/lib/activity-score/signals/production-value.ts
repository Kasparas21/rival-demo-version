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

export function computeProductionValueHeuristic(ads: ScrapedAdForActivityScore[]): {
  score: number;
  videoRatio: number;
} {
  const n = ads.length;
  if (n === 0) return { score: 15, videoRatio: 0 };
  let v = 0;
  for (const a of ads) {
    if (isVideoish(a)) v += 1;
  }
  const videoRatio = v / n;
  return { score: videoRatioScore(videoRatio), videoRatio };
}
