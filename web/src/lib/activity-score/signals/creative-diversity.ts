import { extractActivityLandingKey } from "../landing-page-extractor";
import type { Json } from "@/lib/supabase/types";
import type { ScrapedAdForActivityScore } from "../types";

// Wave 2: replace clustering with perceptual hash on thumbnails for visual dedup.

function landingHostNorm(platform: string, raw: Json): string {
  const u = extractActivityLandingKey(platform, raw);
  if (!u) return "";
  try {
    const url = new URL(u);
    return `${url.hostname}${url.pathname}`.toLowerCase();
  } catch {
    return "";
  }
}

function clusterKey(ad: ScrapedAdForActivityScore): string {
  const t = ad.ad_text.replace(/\s+/g, " ").trim().slice(0, 80).toLowerCase();
  const host = landingHostNorm(ad.platform, ad.raw_payload as Json);
  const fmt = ad.format.trim().toLowerCase();
  return `${t}|${fmt}|${host}`;
}

export function diversityRatioScore(diversityRatio: number): number {
  if (diversityRatio < 0.15) return 18;
  if (diversityRatio < 0.35) return 40;
  if (diversityRatio < 0.55) return 60;
  if (diversityRatio < 0.75) return 78;
  return 92;
}

export function computeCreativeDiversity(ads: ScrapedAdForActivityScore[]): {
  score: number;
  uniqueConcepts: number;
  diversityRatio: number;
} {
  const n = Math.max(ads.length, 1);
  const set = new Set<string>();
  for (const a of ads) set.add(clusterKey(a));
  const uniqueConcepts = set.size;
  const diversityRatio = uniqueConcepts / n;
  return {
    score: diversityRatioScore(diversityRatio),
    uniqueConcepts,
    diversityRatio,
  };
}
