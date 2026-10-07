import type { SupabaseClient } from "@supabase/supabase-js";

import { googleAdCopy } from "@/lib/ad-library/google-ad-copy";
import { angleSlugOf } from "@/lib/strategy-overview/ad-angles";
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
  /** Running per the latest scrape; when absent, "seen within a day of the last scrape" decides. */
  is_active?: boolean | null;
  /** Meta EU reach (people), when published. */
  reach?: number | string | null;
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
export function launchDateKeyForAd(ad: Pick<ScrapedAdRowForCreativeTests, "ai_extracted_launch_date" | "first_seen_at">): string {
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

/** Ads launched this close together can belong to one test. */
export const TEST_WINDOW_DAYS = 3;
/** Larger clusters are bulk launches (one had 151 ads), not A/B tests. */
export const MAX_TEST_SIZE = 10;
/** Copy overlap (word Jaccard) that makes two ads variants; lower when they share an angle category. */
export const COPY_SIMILARITY_MIN = 0.6;
export const COPY_SIMILARITY_SAME_ANGLE_MIN = 0.35;
/**
 * A survivor must outlast every stopped variant by this much. Versions stopped a day ago after the same
 * run (or missed by one scrape) aren't a decision yet.
 */
export const WINNER_MIN_OUTLIVE_DAYS = 7;
/** With several variants still running, a reach lead this large names the winner. */
export const REACH_LEAD_MULTIPLIER = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function testCopy(ad: ScrapedAdRowForCreativeTests): string {
  const p = ad.platform.trim().toLowerCase();
  /** Google/YouTube rows without real copy are generated scaffolding: every ad would look like a variant. */
  const text = p === "google" || p === "youtube" ? googleAdCopy(ad.ad_text) : ad.ad_text ?? "";
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function copyTokens(copy: string): Set<string> {
  return new Set(copy.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function reachOf(ad: ScrapedAdRowForCreativeTests): number | null {
  const n = typeof ad.reach === "string" ? Number(ad.reach) : ad.reach;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

type Prepared = {
  ad: ScrapedAdRowForCreativeTests;
  launchMs: number;
  launchDate: string;
  copy: string;
  tokens: Set<string>;
  angle: string | null;
};

function areVariants(a: Prepared, b: Prepared): boolean {
  if (Math.abs(a.launchMs - b.launchMs) > TEST_WINDOW_DAYS * DAY_MS) return false;
  if (a.copy === b.copy) return true;
  const sim = jaccard(a.tokens, b.tokens);
  if (sim >= COPY_SIMILARITY_MIN) return true;
  return a.angle != null && a.angle !== "other" && a.angle === b.angle && sim >= COPY_SIMILARITY_SAME_ANGLE_MIN;
}

/** Variant clusters per platform (union of variant pairs). */
function clusterVariants(ads: Prepared[]): Prepared[][] {
  const parent = ads.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const sorted = ads.map((a, i) => ({ a, i })).sort((x, y) => x.a.launchMs - y.a.launchMs);
  for (let x = 0; x < sorted.length; x++) {
    for (let y = x + 1; y < sorted.length; y++) {
      if (sorted[y]!.a.launchMs - sorted[x]!.a.launchMs > TEST_WINDOW_DAYS * DAY_MS) break;
      if (areVariants(sorted[x]!.a, sorted[y]!.a)) parent[find(sorted[x]!.i)] = find(sorted[y]!.i);
    }
  }
  const groups = new Map<number, Prepared[]>();
  ads.forEach((a, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(a);
  });
  return [...groups.values()];
}

/**
 * Pure computation used by DB persistence and unit tests.
 *
 * A test is 2–10 ads on one platform, launched within {@link TEST_WINDOW_DAYS} of each other, with
 * near-identical copy (or the same angle category and similar copy). Status follows how advertisers end
 * tests — they stop the losers and keep the winner running:
 * - one variant still running 7+ days after the rest stopped, 14+ days in → winner
 * - several still running → running, unless one leads on published reach by 3×
 * - all stopped → fast fail (<7 days), a 2×-median outlier winner, or no clear winner
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

  const byPlatform = new Map<string, Prepared[]>();
  for (const ad of ads) {
    const launchDate = launchDateKeyForAd(ad);
    const launchMs = Date.parse(`${launchDate}T00:00:00Z`);
    const copy = testCopy(ad);
    if (!launchDate || !Number.isFinite(launchMs) || copy.length < 10) continue;
    const slug = angleSlugOf(ad.ai_extracted_angle);
    const prepared: Prepared = { ad, launchMs, launchDate, copy, tokens: copyTokens(copy), angle: slug };
    if (!byPlatform.has(ad.platform)) byPlatform.set(ad.platform, []);
    byPlatform.get(ad.platform)!.push(prepared);
  }

  const computedTests: CreativeTestComputed[] = [];

  for (const [platform, platformAds] of byPlatform) {
    for (const group of clusterVariants(platformAds)) {
      if (group.length < 2 || group.length > MAX_TEST_SIZE) continue;

      const launchDate = group.reduce((min, g) => (g.launchDate < min ? g.launchDate : min), group[0]!.launchDate);
      const adLifespans = group.map(({ ad }) => {
        const start = new Date(ad.first_seen_at).getTime();
        const end = new Date(ad.last_seen_at).getTime();
        const lifespanDays = Math.floor(Math.max(0, end - start) / DAY_MS);
        const running = typeof ad.is_active === "boolean" ? ad.is_active : end >= killedThresholdMs;
        return { ad, lifespanDays, running, reach: reachOf(ad) };
      });

      const sortedDays = [...adLifespans.map((a) => a.lifespanDays)].sort((x, y) => x - y);
      const medianFloat = medianLifespanDaysFloat(sortedDays);
      const maxDays = sortedDays[sortedDays.length - 1] ?? 0;
      const survivors = adLifespans.filter((a) => a.running);
      const stopped = adLifespans.length - survivors.length;

      let status: CreativeTestStatus;
      let winner: (typeof adLifespans)[number] | null = null;

      if (survivors.length === 1 && stopped > 0) {
        /** The others were switched off and this one kept going: the advertiser picked it. */
        const survivor = survivors[0]!;
        const longestStopped = Math.max(...adLifespans.filter((a) => !a.running).map((a) => a.lifespanDays));
        winner =
          survivor.lifespanDays >= WINNER_MIN_LIFESPAN_DAYS &&
          survivor.lifespanDays - longestStopped >= WINNER_MIN_OUTLIVE_DAYS
            ? survivor
            : null;
        status = winner ? "winner_identified" : "running";
      } else if (survivors.length >= 2) {
        const withReach = [...survivors].filter((a) => a.reach != null).sort((a, b) => b.reach! - a.reach!);
        const lead = withReach.length === survivors.length && withReach.length >= 2
          ? withReach[0]!.reach! >= withReach[1]!.reach! * REACH_LEAD_MULTIPLIER
          : false;
        winner = lead && withReach[0]!.lifespanDays >= WINNER_MIN_LIFESPAN_DAYS ? withReach[0]! : null;
        status = winner ? "winner_identified" : "running";
      } else if (maxDays < ALL_KILLED_FAST_THRESHOLD_DAYS) {
        status = "all_killed_fast";
      } else {
        const candidates = adLifespans.filter(
          (a) =>
            a.lifespanDays === maxDays &&
            a.lifespanDays >= medianFloat * WINNER_SPREAD_MULTIPLIER &&
            a.lifespanDays >= WINNER_MIN_LIFESPAN_DAYS,
        );
        winner = candidates.length === 1 ? candidates[0]! : null;
        status = winner ? "winner_identified" : "no_clear_winner";
      }

      computedTests.push({
        competitor_id: competitorId,
        user_id: userId,
        launch_date: launchDate,
        platform,
        ad_ids: group.map((g) => g.ad.id),
        winner_ad_id: winner?.ad.id ?? null,
        test_status: status,
        median_lifespan_days: Math.round(medianFloat),
        max_lifespan_days: maxDays,
        winner_lifespan_days: winner?.lifespanDays ?? null,
        ad_count: group.length,
      });
    }
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
    .select(
      "id, platform, first_seen_at, last_seen_at, ai_extracted_launch_date, ad_creative_url, ad_text, ai_extracted_angle, format, is_active, reach:raw_payload->transparency_by_location->eu_transparency->>eu_total_reach"
    )
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
