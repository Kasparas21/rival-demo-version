import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ComparisonDerivedStats = {
  avgAdAgeDays: number;
  newAdsLast30d: number;
  videoPercent: number;
  uniqueAnglesCount: number;
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

/**
 * Aggregates over active scraped_ads for comparison stats (no new tables).
 */
export async function computeScrapedAdsDerivedStats(
  supabase: SupabaseServer,
  userId: string,
  competitorId: string
): Promise<ComparisonDerivedStats> {
  const empty: ComparisonDerivedStats = {
    avgAdAgeDays: 0,
    newAdsLast30d: 0,
    videoPercent: 0,
    uniqueAnglesCount: 0,
  };

  const { data, error } = await supabase
    .from("scraped_ads")
    .select("format, first_seen_at, ai_extracted_angle, ai_extracted_launch_date")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true);

  if (error || !data?.length) {
    return empty;
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86_400_000;

  let ageSum = 0;
  let newIn30 = 0;
  let videoCt = 0;
  const angleSet = new Set<string>();

  for (const row of data) {
    const firstMs = Date.parse(row.first_seen_at);
    if (Number.isFinite(firstMs)) {
      ageSum += Math.max(0, Math.round((now - firstMs) / 86_400_000));
    }

    const launchRaw = row.ai_extracted_launch_date?.trim();
    const launchMs = launchRaw ? Date.parse(launchRaw) : NaN;
    const effectiveFirst = Number.isFinite(launchMs) ? launchMs : firstMs;
    if (Number.isFinite(effectiveFirst) && effectiveFirst >= thirtyDaysAgo) {
      newIn30 += 1;
    }

    if (isVideoFormat(row.format ?? "")) {
      videoCt += 1;
    }

    const ang = (row.ai_extracted_angle ?? "").trim();
    if (ang && ang.toLowerCase() !== "unclassified") {
      angleSet.add(ang);
    }
  }

  const n = data.length;
  return {
    avgAdAgeDays: n > 0 ? Math.round(ageSum / n) : 0,
    newAdsLast30d: newIn30,
    videoPercent: n > 0 ? Math.round((videoCt / n) * 100) : 0,
    uniqueAnglesCount: angleSet.size,
  };
}
