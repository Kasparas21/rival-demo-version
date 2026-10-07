import { createHash } from "crypto";

import { metaReachByCountry } from "@/lib/strategy-overview/reach-spend";

type SampleableAd = {
  ad_text: string;
  first_seen_at: string;
  platform: string;
  raw_payload: unknown;
};

function totalReach(ad: SampleableAd): number {
  if (ad.platform.trim().toLowerCase() !== "meta") return 0;
  const byCountry = metaReachByCountry(ad.raw_payload);
  return byCountry ? [...byCountry.values()].reduce((s, n) => s + n, 0) : 0;
}

function normalizeCopy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * The ads the AI rates, chosen the same way every time: one per distinct copy, ordered by real reach
 * (most-seen first), then longest running, then text. It used to be a random 8, so identical data could
 * score differently on each run and trip "activity spike/drop" alerts by chance.
 */
export function pickAiSampleAds<T extends SampleableAd>(ads: T[], limit: number): T[] {
  const byCopy = new Map<string, { ad: T; reach: number; startMs: number }>();
  for (const ad of ads) {
    const copy = normalizeCopy(ad.ad_text);
    if (!copy) continue;
    const reach = totalReach(ad);
    const startMs = Date.parse(ad.first_seen_at);
    const prev = byCopy.get(copy);
    if (!prev || reach > prev.reach) {
      byCopy.set(copy, { ad, reach, startMs: Number.isFinite(startMs) ? startMs : Infinity });
    }
  }
  return [...byCopy.entries()]
    .sort(([copyA, a], [copyB, b]) => b.reach - a.reach || a.startMs - b.startMs || copyA.localeCompare(copyB))
    .slice(0, limit)
    .map(([, v]) => v.ad);
}

/** Stable id of what the AI was shown, so an unchanged sample reuses the previous answer. */
export function aiSampleFingerprint(sampleCopies: string[], productCopies: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify([sampleCopies.map(normalizeCopy), productCopies.map(normalizeCopy)]))
    .digest("hex")
    .slice(0, 32);
}
