import {
  extractImpressionsIndex,
  qualifiesAsUltimateWinner,
  sortAdsByPerformanceSort,
  type AdPerformanceSort,
} from "@/lib/ad-library/ad-performance-ranking";
import { resolveTimelineAdKilled } from "@/lib/timeline/resolve-timeline-ad-killed";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DiscoveryAdDto,
  DiscoveryCompetitorChip,
  DiscoveryFeedQuery,
  DiscoveryFeedResult,
} from "./types";
import type { Database } from "@/lib/supabase/types";

const FETCH_CAP = 3000;
const DAY_MS = 86_400_000;

type ScrapedRow = {
  id: string;
  competitor_id: string;
  platform: string;
  format: string | null;
  ad_text: string;
  ad_creative_url: string | null;
  archived_creative_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean | null;
  raw_payload: unknown;
};

type CompetitorRow = {
  id: string;
  name: string | null;
  brand_name: string | null;
  brand_domain: string | null;
  logo_url: string | null;
  brand_logo_url: string | null;
  last_scraped_at: string | null;
};

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let state = hashSeed(seed) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (Math.imul(state, 48271) + i) % 2147483647;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function isVideoFormat(format: string | null | undefined): boolean {
  const f = (format ?? "").trim().toLowerCase();
  return f.includes("video") || f === "reel" || f === "carousel_video";
}

function datePresetStart(preset: DiscoveryFeedQuery["datePreset"], nowMs: number): number | null {
  if (preset === "all") return null;
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return nowMs - days * DAY_MS;
}

async function loadCompetitorIdsForBrand(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
): Promise<string[]> {
  const { data: mapped, error: mapErr } = await supabase
    .from("brand_competitors")
    .select("competitor_id")
    .eq("user_id", userId)
    .eq("brand_id", brandId);

  if (!mapErr && (mapped ?? []).length > 0) {
    return mapped!.map((r) => String(r.competitor_id)).filter(Boolean);
  }

  const { data: rows } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("user_id", userId)
    .eq("is_workspace_brand", false);

  return (rows ?? []).map((r) => r.id);
}

export async function buildDiscoveryFeed(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: DiscoveryFeedQuery,
): Promise<DiscoveryFeedResult | { ok: false; error: string }> {
  const competitorIds = await loadCompetitorIdsForBrand(supabase, userId, input.brandId);
  if (!competitorIds.length) {
    return {
      ok: true,
      ads: [],
      total: 0,
      offset: input.offset,
      limit: input.limit,
      has_more: false,
      competitors: [],
      platform_counts: {},
      shuffle_seed: input.shuffleSeed,
    };
  }

  const { data: competitors, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, logo_url, brand_logo_url, last_scraped_at")
    .eq("user_id", userId)
    .in("id", competitorIds);

  if (compErr) return { ok: false, error: compErr.message };

  const competitorById = new Map<string, CompetitorRow>();
  for (const c of competitors ?? []) {
    competitorById.set(c.id, c);
  }

  let adsQuery = supabase
    .from("scraped_ads")
    .select(
      "id, competitor_id, platform, format, ad_text, ad_creative_url, archived_creative_url, first_seen_at, last_seen_at, is_active, raw_payload",
    )
    .eq("user_id", userId)
    .in("competitor_id", competitorIds)
    .order("last_seen_at", { ascending: false })
    .limit(FETCH_CAP);

  if (input.competitorId) {
    adsQuery = adsQuery.eq("competitor_id", input.competitorId);
  }

  const { data: adRows, error: adsErr } = await adsQuery;
  if (adsErr) return { ok: false, error: adsErr.message };

  const nowMs = Date.now();
  const dateStart = datePresetStart(input.datePreset, nowMs);
  const needle = input.query.trim().toLowerCase();
  const platformSet = new Set(input.platforms.map((p) => p.trim().toLowerCase()).filter(Boolean));

  const hydrated: DiscoveryAdDto[] = [];
  const platformCounts: Record<string, number> = {};
  const competitorCounts = new Map<string, number>();

  for (const row of (adRows ?? []) as ScrapedRow[]) {
    const comp = competitorById.get(row.competitor_id);
    if (!comp) continue;

    const is_killed = resolveTimelineAdKilled(
      {
        platform: row.platform,
        last_seen_at: row.last_seen_at,
        is_active: row.is_active ?? true,
        raw_payload: row.raw_payload,
      },
      comp.last_scraped_at,
    );

    const impressions_index = extractImpressionsIndex(row.raw_payload);
    const startMs = new Date(row.first_seen_at).getTime();
    const endMs = is_killed ? new Date(row.last_seen_at).getTime() : nowMs;
    const daysRunning = Math.max(0, Math.floor((endMs - startMs) / DAY_MS));
    const is_ultimate_winner = qualifiesAsUltimateWinner(impressions_index, daysRunning);

    if (platformSet.size > 0 && !platformSet.has(row.platform.trim().toLowerCase())) continue;
    if (input.status === "active" && is_killed) continue;
    if (input.status === "retired" && !is_killed) continue;
    if (input.ultimateOnly && !is_ultimate_winner) continue;
    if (input.format === "video" && !isVideoFormat(row.format)) continue;
    if (input.format === "image" && isVideoFormat(row.format)) continue;
    if (dateStart != null && endMs < dateStart) continue;
    if (needle) {
      const hay = `${row.ad_text} ${comp.brand_name ?? ""} ${comp.name ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) continue;
    }

    platformCounts[row.platform] = (platformCounts[row.platform] ?? 0) + 1;
    competitorCounts.set(row.competitor_id, (competitorCounts.get(row.competitor_id) ?? 0) + 1);

    hydrated.push({
      id: row.id,
      competitor_id: row.competitor_id,
      competitor_name: comp.brand_name?.trim() || comp.name?.trim() || "Competitor",
      competitor_domain: comp.brand_domain?.trim() || null,
      competitor_logo_url: comp.brand_logo_url?.trim() || comp.logo_url?.trim() || null,
      platform: row.platform,
      format: row.format ?? "",
      ad_text: row.ad_text,
      ad_creative_url: row.ad_creative_url,
      archived_creative_url: row.archived_creative_url,
      first_seen_at: row.first_seen_at,
      last_seen_at: row.last_seen_at,
      is_active: row.is_active ?? true,
      is_killed,
      impressions_index,
      is_ultimate_winner,
      raw_payload: row.raw_payload as DiscoveryAdDto["raw_payload"],
    });
  }

  let sorted = hydrated;
  if (input.sort === "shuffle") {
    sorted = seededShuffle(hydrated, input.shuffleSeed);
  } else {
    sorted = sortAdsByPerformanceSort(hydrated, input.sort as AdPerformanceSort, {
      impressionsIndexFor: (ad) => ad.impressions_index,
      daysRunningFor: (ad) => {
        const start = new Date(ad.first_seen_at).getTime();
        const end = ad.is_killed ? new Date(ad.last_seen_at).getTime() : nowMs;
        return Math.max(0, Math.floor((end - start) / DAY_MS));
      },
      newestMsFor: (ad) => new Date(ad.first_seen_at).getTime(),
    });
  }

  const total = sorted.length;
  const page = sorted.slice(input.offset, input.offset + input.limit);

  const competitorChips: DiscoveryCompetitorChip[] = [...competitorById.entries()]
    .map(([id, c]) => ({
      id,
      name: c.brand_name?.trim() || c.name?.trim() || "Competitor",
      domain: c.brand_domain?.trim() || null,
      logo_url: c.brand_logo_url?.trim() || c.logo_url?.trim() || null,
      ad_count: competitorCounts.get(id) ?? 0,
    }))
    .filter((c) => c.ad_count > 0)
    .sort((a, b) => b.ad_count - a.ad_count || a.name.localeCompare(b.name));

  return {
    ok: true,
    ads: page,
    total,
    offset: input.offset,
    limit: input.limit,
    has_more: input.offset + page.length < total,
    competitors: competitorChips,
    platform_counts: platformCounts,
    shuffle_seed: input.shuffleSeed,
  };
}
