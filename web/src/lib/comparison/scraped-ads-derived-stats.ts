import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { angleSlugOf } from "@/lib/strategy-overview/ad-angles";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ComparisonDerivedStats = {
  /** Mean age of active ads in days (launch date, else first seen), one ad one vote. */
  avgAdAgeDays: number;
  newAdsLast30d: number;
  videoPercent: number;
  /** Distinct angle categories among active ads (not distinct labels, which ≈ ad count). */
  uniqueAnglesCount: number;
  /** Counted live, so both sides of a comparison come from the same moment (absent on older responses). */
  activeAds?: number;
  platformCount?: number;
  asOf?: string;
};

function isVideoFormat(format: string): boolean {
  const f = format.trim().toLowerCase();
  return (
    f.includes("video") ||
    f === "reel" ||
    f === "single_video" ||
    f === "shorts" ||
    f === "carousel_video"
  );
}

const PAGE = 1000;

/**
 * Aggregates over active scraped_ads for comparison stats. Both sides of a comparison go through here at
 * the same moment: the old path read stored strategy maps when present (often weeks apart) and averaged
 * per-platform averages, so 3 TikTok ads weighed as much as 300 Meta ads.
 */
export async function computeScrapedAdsDerivedStats(
  supabase: SupabaseServer,
  userId: string,
  competitorId: string,
  nowMs = Date.now(),
): Promise<ComparisonDerivedStats> {
  const asOf = new Date(nowMs).toISOString();
  const empty: ComparisonDerivedStats = {
    avgAdAgeDays: 0,
    newAdsLast30d: 0,
    videoPercent: 0,
    uniqueAnglesCount: 0,
    activeAds: 0,
    platformCount: 0,
    asOf,
  };

  const rows: { platform: string; format: string | null; first_seen_at: string; ai_extracted_angle: string | null; ai_extracted_launch_date: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("scraped_ads")
      .select("platform, format, first_seen_at, ai_extracted_angle, ai_extracted_launch_date")
      .eq("user_id", userId)
      .eq("competitor_id", competitorId)
      .eq("is_active", true)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return empty;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return derivedStatsFromRows(rows, nowMs);
}

export function derivedStatsFromRows(
  rows: { platform: string; format: string | null; first_seen_at: string; ai_extracted_angle: string | null; ai_extracted_launch_date: string | null }[],
  nowMs: number,
): ComparisonDerivedStats {
  const thirtyDaysAgo = nowMs - 30 * 86_400_000;
  let ageSum = 0;
  let ageN = 0;
  let newIn30 = 0;
  let videoCt = 0;
  const angleSet = new Set<string>();
  const platforms = new Set<string>();

  for (const row of rows) {
    platforms.add(row.platform.trim().toLowerCase());
    const firstMs = Date.parse(row.first_seen_at);
    const launchRaw = row.ai_extracted_launch_date?.trim();
    const launchMs = launchRaw ? Date.parse(launchRaw) : NaN;
    const effectiveFirst = Number.isFinite(launchMs) ? launchMs : firstMs;
    if (Number.isFinite(effectiveFirst)) {
      ageSum += Math.max(0, (nowMs - effectiveFirst) / 86_400_000);
      ageN += 1;
      if (effectiveFirst >= thirtyDaysAgo) newIn30 += 1;
    }
    if (isVideoFormat(row.format ?? "")) videoCt += 1;
    const ang = angleSlugOf(row.ai_extracted_angle);
    if (ang && ang !== "other") angleSet.add(ang);
  }

  const n = rows.length;
  return {
    avgAdAgeDays: ageN > 0 ? Math.round(ageSum / ageN) : 0,
    newAdsLast30d: newIn30,
    videoPercent: n > 0 ? Math.round((videoCt / n) * 100) : 0,
    uniqueAnglesCount: angleSet.size,
    activeAds: n,
    platformCount: platforms.size,
    asOf: new Date(nowMs).toISOString(),
  };
}
