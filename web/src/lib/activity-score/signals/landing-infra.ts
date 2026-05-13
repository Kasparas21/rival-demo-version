import type { Json } from "@/lib/supabase/types";
import { extractActivityLandingKey } from "../landing-page-extractor";
import type { ScrapedAdForActivityScore } from "../types";

export function landingInfraScore(uniquePages: number): number {
  if (uniquePages <= 1) return 10;
  if (uniquePages <= 3) return 30;
  if (uniquePages <= 10) return 55;
  if (uniquePages <= 30) return 80;
  return 100;
}

export function computeLandingInfra(ads: ScrapedAdForActivityScore[]): {
  score: number;
  uniquePages: number;
} {
  const urls = new Set<string>();
  for (const a of ads) {
    const u = extractActivityLandingKey(a.platform, a.raw_payload as Json);
    if (u) urls.add(u);
  }
  const uniquePages = urls.size;
  if (uniquePages === 0) {
    return { score: 25, uniquePages: 0 };
  }
  return { score: landingInfraScore(uniquePages), uniquePages };
}
