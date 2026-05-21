import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export const KILLED_BUFFER_HOURS = 24;
export const WINNER_MIN_LIFESPAN_DAYS = 14;
export const WINNER_SPREAD_MULTIPLIER = 2;
export const ALL_KILLED_FAST_THRESHOLD_DAYS = 7;

export type CreativeTestStatus = "running" | "winner_identified" | "all_killed_fast" | "no_clear_winner";

export type ScrapedAdRowForCreativeTests = {
  id: string;
  platform: string;
  first_seen_at: string;
  last_seen_at: string;
  ai_extracted_launch_date: string | null;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  format: string;
};

export type CreativeTestComputed = {
  competitor_id: string;
  user_id: string;
  launch_date: string;
  platform: string;
  ad_ids: string[];
  winner_ad_id: string | null;
  test_status: CreativeTestStatus;
  /** Rounded median (for storage / UI); classification uses float median internally */
  median_lifespan_days: number;
  max_lifespan_days: number;
  winner_lifespan_days: number | null;
  ad_count: number;
};

/**
 * Handles ISO ("2026-05-10T21:00:00+00:00") and Postgres ("2026-05-10 21:00:00+00") timestamp strings.
 */
export function extractLaunchDate(timestamp: string): string {
  const t = timestamp.trim();
  const match = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1]!;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toISOString().split("T")[0];
}

/** YYYY-MM-DD for grouping from AI launch or first_seen. */
export function launchDateKeyForAd(
  ad: Pick<ScrapedAdRowForCreativeTests, "first_seen_at"> & {
    ai_extracted_launch_date?: string | null;
  },
): string {
  const launchSignal = (ad.ai_extracted_launch_date?.trim() ? ad.ai_extracted_launch_date : ad.first_seen_at) || "";
  if (!launchSignal.trim()) return "";
  return extractLaunchDate(launchSignal);
}

export function medianLifespanDaysFloat(sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 0;
  const n = sortedAsc.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedAsc[mid]!;
  return (sortedAsc[mid - 1]! + sortedAsc[mid]!) / 2;
}

/**
 * Pure computation used by DB persistence and unit tests.
 */
export function computeCreativeTestsData(params: {
  userId: string;
  competitorId: string;
  ads: ScrapedAdRowForCreativeTests[];
  /** When null, uses current time for killed threshold (no recent scrape timestamp). */
  lastScrapedAtIso: string | null;
}): CreativeTestComputed[] {
  const { userId, competitorId, ads, lastScrapedAtIso } = params;

  const lastScrapedMs = lastScrapedAtIso?.trim()
    ? new Date(lastScrapedAtIso).getTime()
    : Date.now();
  const killedThresholdMs = lastScrapedMs - KILLED_BUFFER_HOURS * 60 * 60 * 1000;

  const groups = new Map<string, ScrapedAdRowForCreativeTests[]>();
  for (const ad of ads) {
    const launchDate = launchDateKeyForAd(ad);
    if (!launchDate) continue;
    const key = `${launchDate}|${ad.platform}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ad);
  }

  const computedTests: CreativeTestComputed[] = [];

  for (const [key, groupAds] of groups) {
    if (groupAds.length < 2) continue;

    const [launchDate, platform] = key.split("|");
    if (!launchDate || !platform) continue;

    const adLifespans = groupAds.map((ad) => {
      const start = new Date(ad.first_seen_at).getTime();
      const end = new Date(ad.last_seen_at).getTime();
      const lifespanMs = Math.max(0, end - start);
      const lifespanDays = Math.floor(lifespanMs / (24 * 60 * 60 * 1000));
      const isKilled = end < killedThresholdMs;
      return { ad, lifespanDays, isKilled };
    });

    const allKilled = adLifespans.every((a) => a.isKilled);
    const anyActive = !allKilled;

    const sortedDays = [...adLifespans.map((a) => a.lifespanDays)].sort((x, y) => x - y);
    const medianFloat = medianLifespanDaysFloat(sortedDays);
    const medianRounded = Math.round(medianFloat);
    const maxDays = sortedDays[sortedDays.length - 1] ?? 0;

    let status: CreativeTestStatus;
    let winnerAdId: string | null = null;
    let winnerLifespan: number | null = null;

    if (anyActive) {
      status = "running";
    } else if (maxDays < ALL_KILLED_FAST_THRESHOLD_DAYS) {
      status = "all_killed_fast";
    } else {
      const maxLifespan = maxDays;
      const spread = medianFloat * WINNER_SPREAD_MULTIPLIER;
      const candidates = adLifespans.filter(
        (a) =>
          a.lifespanDays === maxLifespan &&
          a.lifespanDays >= spread &&
          a.lifespanDays >= WINNER_MIN_LIFESPAN_DAYS,
      );
      if (candidates.length === 1) {
        status = "winner_identified";
        winnerAdId = candidates[0]!.ad.id;
        winnerLifespan = candidates[0]!.lifespanDays;
      } else {
        status = "no_clear_winner";
      }
    }

    computedTests.push({
      competitor_id: competitorId,
      user_id: userId,
      launch_date: launchDate,
      platform,
      ad_ids: groupAds.map((a) => a.id),
      winner_ad_id: winnerAdId,
      test_status: status,
      median_lifespan_days: medianRounded,
      max_lifespan_days: maxDays,
      winner_lifespan_days: winnerLifespan,
      ad_count: groupAds.length,
    });
  }

  return computedTests;
}

export async function computeCreativeTestsForCompetitor(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
}): Promise<{ ok: true; tests: CreativeTestComputed[] } | { ok: false; error: string }> {
  const { supabase, userId, competitorId } = params;

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (compErr || !competitor) {
    return { ok: false, error: `Competitor not found: ${compErr?.message ?? "unknown"}` };
  }

  const { data: ads, error: adsErr } = await supabase
    .from("scraped_ads")
    .select("id, platform, first_seen_at, last_seen_at, ai_extracted_launch_date, ad_creative_url, ad_text, ai_extracted_angle, format")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId);

  if (adsErr) {
    return { ok: false, error: `Failed to load ads: ${adsErr.message}` };
  }

  if (!ads || ads.length === 0) {
    const { error: delErr } = await supabase.from("creative_tests").delete().eq("competitor_id", competitorId);
    if (delErr) {
      return { ok: false, error: `Failed to clear tests: ${delErr.message}` };
    }
    return { ok: true, tests: [] };
  }

  const computedTests = computeCreativeTestsData({
    userId,
    competitorId,
    ads: ads as ScrapedAdRowForCreativeTests[],
    lastScrapedAtIso: competitor.last_scraped_at,
  });

  const { error: delErr } = await supabase.from("creative_tests").delete().eq("competitor_id", competitorId);
  if (delErr) {
    return { ok: false, error: `Failed to clear old tests: ${delErr.message}` };
  }

  if (computedTests.length > 0) {
    const rows: Database["public"]["Tables"]["creative_tests"]["Insert"][] = computedTests.map((t) => ({
      user_id: t.user_id,
      competitor_id: t.competitor_id,
      launch_date: t.launch_date,
      platform: t.platform,
      ad_ids: t.ad_ids,
      winner_ad_id: t.winner_ad_id,
      test_status: t.test_status,
      median_lifespan_days: t.median_lifespan_days,
      max_lifespan_days: t.max_lifespan_days,
      winner_lifespan_days: t.winner_lifespan_days,
      ad_count: t.ad_count,
    }));

    const { error: insertErr } = await supabase.from("creative_tests").insert(rows);
    if (insertErr) {
      return { ok: false, error: `Failed to insert tests: ${insertErr.message}` };
    }
  }

  return { ok: true, tests: computedTests };
}
