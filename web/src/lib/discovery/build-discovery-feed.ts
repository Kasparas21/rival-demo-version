import {
  extractImpressionsIndex,
  passesUltimateWinnersFeedFilter,
  qualifiesAsUltimateWinner,
  resolveScrapedAdRunDays,
  sortAdsByPerformanceSort,
  type AdPerformanceSort,
} from "@/lib/ad-library/ad-performance-ranking";
import { computeDiscoveryMarketStats } from "@/lib/discovery/compute-discovery-market-stats";
import { resolveTimelineAdKilled } from "@/lib/timeline/resolve-timeline-ad-killed";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DiscoveryAdDto,
  DiscoveryCompetitorChip,
  DiscoveryFeedQuery,
  DiscoveryFeedResult,
} from "./types";
import type { Database, Json } from "@/lib/supabase/types";

const FETCH_CAP = 1500;
const IN_CHUNK = 40;
const DAY_MS = 86_400_000;

const LEAN_AD_SELECT =
  "id, competitor_id, platform, format, ad_text, ad_creative_url, archived_creative_url, first_seen_at, last_seen_at, is_active";
const FULL_AD_SELECT = `${LEAN_AD_SELECT}, raw_payload`;

type ScrapedRow = {
  id: string;
  competitor_id: string;
  platform: string;
  format: string | null;
  ad_text: string | null;
  ad_creative_url: string | null;
  archived_creative_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean | null;
  raw_payload?: unknown;
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

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let state = hashSeed(seed) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (Math.imul(state, 48271) + i) >>> 0;
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

function normalizePlatform(platform: string | null | undefined): string {
  return (platform ?? "").trim().toLowerCase();
}

function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBrandCompetitorsTableError(message: string | undefined): boolean {
  return Boolean(
    message &&
      (isMissingDbColumnError(message, "brand_competitors") || /brand_competitors/i.test(message)),
  );
}

async function loadAllSavedCompetitorIds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ ids: string[]; error?: string }> {
  const { data: rows, error: rowsErr } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("user_id", userId)
    .eq("is_workspace_brand", false);

  if (rowsErr) return { ids: [], error: rowsErr.message };
  return { ids: (rows ?? []).map((r) => r.id) };
}

async function loadCompetitorIdsForBrand(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
): Promise<{ ids: string[]; error?: string }> {
  /**
   * Legacy sentinel brand ids ("default", "_workspace") are not rows in `brands`;
   * querying `brand_competitors.brand_id` (uuid) with them is a Postgres type error.
   * Treat any non-UUID brand id as "all tracked competitors".
   */
  const isRealBrandId = UUID_RE.test(brandId.trim());

  if (isRealBrandId) {
    const { data: mappings, error: mapErr } = await supabase
      .from("brand_competitors")
      .select("competitor_id")
      .eq("user_id", userId)
      .eq("brand_id", brandId);

    if (mapErr && !isBrandCompetitorsTableError(mapErr.message)) {
      return { ids: [], error: mapErr.message };
    }

    const mappedIds = [...new Set((mappings ?? []).map((r) => String(r.competitor_id)).filter(Boolean))];
    if (mappedIds.length > 0) return { ids: mappedIds };
  }

  return loadAllSavedCompetitorIds(supabase, userId);
}

export async function loadCompetitorIdsForBrandIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandIds: string[],
): Promise<{ ids: string[]; error?: string }> {
  const uniqueBrandIds = [...new Set(brandIds.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueBrandIds.length) return { ids: [] };

  const allIds = new Set<string>();
  for (const brandId of uniqueBrandIds) {
    const { ids, error } = await loadCompetitorIdsForBrand(supabase, userId, brandId);
    if (error) return { ids: [], error };
    for (const id of ids) allIds.add(id);
  }

  return { ids: [...allIds] };
}

async function loadCompetitorClientBrandLabels(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
): Promise<Map<string, string>> {
  const namesByCompetitor = new Map<string, string[]>();

  for (const chunk of chunkIds(competitorIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("brand_competitors")
      .select("competitor_id, brands(name)")
      .eq("user_id", userId)
      .in("competitor_id", chunk);

    if (error) continue;

    for (const row of data ?? []) {
      const brand = row.brands as { name?: string | null } | null;
      const name = brand?.name?.trim();
      if (!name) continue;
      const competitorId = String(row.competitor_id);
      const list = namesByCompetitor.get(competitorId) ?? [];
      if (!list.includes(name)) list.push(name);
      namesByCompetitor.set(competitorId, list);
    }
  }

  const labels = new Map<string, string>();
  for (const [competitorId, names] of namesByCompetitor) {
    labels.set(competitorId, names.sort((a, b) => a.localeCompare(b)).join(", "));
  }
  return labels;
}

async function loadCompetitorsById(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
): Promise<{ rows: CompetitorRow[]; error?: string }> {
  const rows: CompetitorRow[] = [];
  for (const chunk of chunkIds(competitorIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain, logo_url, brand_logo_url, last_scraped_at")
      .eq("user_id", userId)
      .in("id", chunk);
    if (error) return { rows: [], error: error.message };
    rows.push(...((data ?? []) as CompetitorRow[]));
  }
  return { rows };
}

async function fetchScrapedAdRows(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
  select: string,
): Promise<{ rows: ScrapedRow[]; error?: string }> {
  const byId = new Map<string, ScrapedRow>();

  const fetchChunk = async (chunk: string[], selectCols: string) => {
    return supabase
      .from("scraped_ads")
      .select(selectCols)
      .eq("user_id", userId)
      .eq("platform", "meta")
      .in("competitor_id", chunk)
      .order("last_seen_at", { ascending: false })
      .limit(FETCH_CAP);
  };

  for (const chunk of chunkIds(competitorIds, IN_CHUNK)) {
    let { data, error } = await fetchChunk(chunk, select);

    if (
      error &&
      select.includes("archived_creative_url") &&
      isMissingDbColumnError(error.message, "archived_creative_url")
    ) {
      const fallbackSelect = select.replace(", archived_creative_url", "").replace("archived_creative_url, ", "");
      ({ data, error } = await fetchChunk(chunk, fallbackSelect));
    }

    if (error) return { rows: [], error: error.message };

    for (const row of (data ?? []) as unknown as ScrapedRow[]) {
      if (!row?.id) continue;
      byId.set(row.id, {
        ...row,
        archived_creative_url: row.archived_creative_url ?? null,
        raw_payload: row.raw_payload,
      });
    }
  }

  const rows = [...byId.values()]
    .sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime())
    .slice(0, FETCH_CAP);

  return { rows };
}

async function attachRawPayloads(
  supabase: SupabaseClient<Database>,
  userId: string,
  ads: DiscoveryAdDto[],
): Promise<DiscoveryAdDto[]> {
  const missing = ads.filter((ad) => ad.raw_payload == null);
  if (missing.length === 0) return ads;

  const payloadById = new Map<string, Json>();
  for (const chunk of chunkIds(
    missing.map((ad) => ad.id),
    IN_CHUNK,
  )) {
    const { data, error } = await supabase
      .from("scraped_ads")
      .select("id, raw_payload")
      .eq("user_id", userId)
      .in("id", chunk);
    if (error) continue;
    for (const row of data ?? []) {
      if (row?.id) payloadById.set(row.id, row.raw_payload);
    }
  }

  return ads.map((ad) =>
    ad.raw_payload != null
      ? ad
      : { ...ad, raw_payload: (payloadById.get(ad.id) ?? null) as DiscoveryAdDto["raw_payload"] },
  );
}

function hydrateDiscoveryRow(
  row: ScrapedRow,
  comp: CompetitorRow,
  nowMs: number,
  input: DiscoveryFeedQuery,
  dateStart: number | null,
  needle: string,
  platformSet: Set<string>,
  clientBrandName: string | null,
): DiscoveryAdDto | null {
  const platform = normalizePlatform(row.platform);
  if (!row.id || !platform) return null;

  const is_killed = resolveTimelineAdKilled(
    {
      platform,
      last_seen_at: row.last_seen_at,
      is_active: row.is_active ?? true,
      raw_payload: row.raw_payload ?? null,
    },
    comp.last_scraped_at,
    nowMs,
  );

  const impressions_index = extractImpressionsIndex(row.raw_payload ?? null);
  const scrapeAtMs = comp.last_scraped_at ? new Date(comp.last_scraped_at).getTime() : nowMs;
  const daysRunning = resolveScrapedAdRunDays({
    platform,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_killed,
    raw_payload: row.raw_payload ?? null,
    scrapeAtMs,
    nowMs,
  });
  const is_ultimate_winner = qualifiesAsUltimateWinner(impressions_index, daysRunning);
  const endMs = is_killed ? new Date(row.last_seen_at).getTime() : nowMs;

  if (platformSet.size > 0 && !platformSet.has(platform)) return null;
  if (input.status === "active" && is_killed) return null;
  if (input.status === "retired" && !is_killed) return null;
  if (input.ultimateOnly && !passesUltimateWinnersFeedFilter(impressions_index, daysRunning)) return null;
  if (input.format === "video" && !isVideoFormat(row.format)) return null;
  if (input.format === "image" && isVideoFormat(row.format)) return null;
  if (dateStart != null && endMs < dateStart) return null;
  if (needle) {
    const hay = `${row.ad_text ?? ""} ${comp.brand_name ?? ""} ${comp.name ?? ""}`.toLowerCase();
    if (!hay.includes(needle)) return null;
  }

  return {
    id: row.id,
    competitor_id: row.competitor_id,
    competitor_name: comp.brand_name?.trim() || comp.name?.trim() || "Competitor",
    competitor_domain: comp.brand_domain?.trim() || null,
    competitor_logo_url: comp.brand_logo_url?.trim() || comp.logo_url?.trim() || null,
    client_brand_name: clientBrandName,
    platform,
    format: row.format ?? "",
    ad_text: row.ad_text ?? "",
    ad_creative_url: row.ad_creative_url,
    archived_creative_url: row.archived_creative_url ?? null,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_active: row.is_active ?? true,
    is_killed,
    impressions_index,
    is_ultimate_winner,
    raw_payload: (row.raw_payload ?? null) as DiscoveryAdDto["raw_payload"],
  };
}

export async function buildDiscoveryFeed(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: DiscoveryFeedQuery,
): Promise<DiscoveryFeedResult | { ok: false; error: string }> {
  const clientBrandIds =
    input.clientBrandIds.length > 0
      ? [...new Set(input.clientBrandIds.map((id) => id.trim()).filter((id) => UUID_RE.test(id)))]
      : [input.brandId];
  const { ids: competitorIds, error: competitorIdsError } = await loadCompetitorIdsForBrandIds(
    supabase,
    userId,
    clientBrandIds,
  );
  if (competitorIdsError) return { ok: false, error: competitorIdsError };
  const competitorFilter = input.competitorFilterIds.length
    ? [...new Set(input.competitorFilterIds.filter((id) => competitorIds.includes(id)))]
    : null;
  const scopedCompetitorIds = competitorFilter?.length ? competitorFilter : competitorIds;
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
      market_stats: computeDiscoveryMarketStats([]),
      shuffle_seed: input.shuffleSeed,
    };
  }

  const { rows: competitors, error: compErr } = await loadCompetitorsById(supabase, userId, scopedCompetitorIds);
  if (compErr) return { ok: false, error: compErr };

  const competitorById = new Map<string, CompetitorRow>();
  for (const c of competitors) {
    if (c?.id) competitorById.set(c.id, c);
  }

  const showClientLabels = clientBrandIds.length > 1;
  const clientBrandLabels = showClientLabels
    ? await loadCompetitorClientBrandLabels(supabase, userId, scopedCompetitorIds)
    : new Map<string, string>();

  const needsPayloadUpfront =
    input.sort === "impressions" ||
    input.sort === "ultimate_winner" ||
    input.ultimateOnly;

  const { rows: adRows, error: adsErr } = await fetchScrapedAdRows(
    supabase,
    userId,
    scopedCompetitorIds,
    needsPayloadUpfront ? FULL_AD_SELECT : LEAN_AD_SELECT,
  );
  if (adsErr) return { ok: false, error: adsErr };

  const nowMs = Date.now();
  const dateStart = datePresetStart(input.datePreset, nowMs);
  const needle = input.query.trim().toLowerCase();
  const platformSet = new Set(input.platforms.map((p) => p.trim().toLowerCase()).filter(Boolean));

  const hydrated: DiscoveryAdDto[] = [];
  const platformCounts: Record<string, number> = {};
  const competitorCounts = new Map<string, number>();

  for (const row of adRows) {
    const comp = competitorById.get(row.competitor_id);
    if (!comp) continue;

    const dto = hydrateDiscoveryRow(
      row,
      comp,
      nowMs,
      input,
      dateStart,
      needle,
      platformSet,
      clientBrandLabels.get(row.competitor_id) ?? null,
    );
    if (!dto) continue;

    platformCounts[dto.platform] = (platformCounts[dto.platform] ?? 0) + 1;
    competitorCounts.set(dto.competitor_id, (competitorCounts.get(dto.competitor_id) ?? 0) + 1);
    hydrated.push(dto);
  }

  let sorted = hydrated;
  if (input.sort === "shuffle") {
    sorted = seededShuffle(hydrated, input.shuffleSeed);
  } else {
    sorted = sortAdsByPerformanceSort(hydrated, input.sort as AdPerformanceSort, {
      impressionsIndexFor: (ad) => ad.impressions_index,
      daysRunningFor: (ad) => {
        const comp = competitorById.get(ad.competitor_id);
        const scrapeAtMs = comp?.last_scraped_at ? new Date(comp.last_scraped_at).getTime() : nowMs;
        return resolveScrapedAdRunDays({
          platform: ad.platform,
          first_seen_at: ad.first_seen_at,
          last_seen_at: ad.last_seen_at,
          is_killed: ad.is_killed,
          raw_payload: ad.raw_payload,
          scrapeAtMs,
          nowMs,
        });
      },
      newestMsFor: (ad) => new Date(ad.first_seen_at).getTime(),
    });
  }

  const total = sorted.length;
  const market_stats = computeDiscoveryMarketStats(hydrated, nowMs);
  let page = sorted.slice(input.offset, input.offset + input.limit);

  if (!needsPayloadUpfront) {
    page = await attachRawPayloads(supabase, userId, page);
  }

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
    ads: page.filter((ad) => Boolean(ad?.id)),
    total,
    offset: input.offset,
    limit: input.limit,
    has_more: input.offset + page.length < total,
    competitors: competitorChips,
    platform_counts: platformCounts,
    market_stats,
    shuffle_seed: input.shuffleSeed,
  };
}
