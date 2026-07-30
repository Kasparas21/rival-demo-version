import { getChangeKind, matchesChangeFilter } from "@/components/website-tracker/change-display";
import { parseChangeAnalysis } from "@/components/website-tracker/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadCompetitorClientBrandLabels,
  loadCompetitorIdsForBrandIds,
  loadCompetitorsById,
} from "./build-discovery-feed";
import type {
  DiscoveryCompetitorChip,
  DiscoveryDatePreset,
  DiscoveryLandingPageChangeDto,
  DiscoveryLandingPagesQuery,
  DiscoveryLandingPagesResult,
} from "./types";
import type { Database, Json } from "@/lib/supabase/types";

const DAY_MS = 86_400_000;
const IN_CHUNK = 40;

type SnapshotRow = {
  id: string;
  landing_page_id: string;
  competitor_id: string;
  screenshot_url: string;
  hero_screenshot_url: string | null;
  page_text: Json;
  pixel_diff_pct: number | null;
  change_analysis: Json;
  taken_at: string;
};

type LandingPageRow = {
  id: string;
  label: string;
  url: string;
  page_type: string;
};

type CompetitorRow = {
  id: string;
  name: string | null;
  brand_name: string | null;
  brand_domain: string | null;
  logo_url: string | null;
  brand_logo_url: string | null;
};

function datePresetStart(preset: DiscoveryDatePreset, nowMs: number): number | null {
  if (preset === "all") return null;
  if (preset === "today") {
    const d = new Date(nowMs);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }
  const days =
    preset === "3d"
      ? 3
      : preset === "4d"
        ? 4
        : preset === "7d"
          ? 7
          : preset === "30d"
            ? 30
            : 90;
  return nowMs - days * DAY_MS;
}

function competitorDisplayName(row: CompetitorRow): string {
  return (row.brand_name ?? row.name ?? "Competitor").trim() || "Competitor";
}

function competitorLogo(row: CompetitorRow): string | null {
  return row.brand_logo_url ?? row.logo_url ?? null;
}

function pageTextSearchBlob(raw: Json | null | undefined): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const o = raw as Record<string, unknown>;
  const parts = [
    o.headline,
    o.subheadline,
    o.cta_text,
    Array.isArray(o.pricing_tiers) ? o.pricing_tiers.join(" ") : null,
    o.full_text,
  ];
  return parts.filter((p) => typeof p === "string").join(" ").toLowerCase();
}

function matchesSearch(change: DiscoveryLandingPageChangeDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const analysis = parseChangeAnalysis(change.change_analysis);
  const haystack = [
    change.label,
    change.url,
    change.competitor_name,
    change.competitor_domain ?? "",
    analysis.what_changed ?? "",
    analysis.strategic_interpretation ?? "",
    pageTextSearchBlob(change.page_text),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function threatScore(raw: Json | null | undefined): number {
  const analysis = parseChangeAnalysis(raw);
  return typeof analysis.threat_score === "number" ? analysis.threat_score : -1;
}

function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchLandingPagesById(
  supabase: SupabaseClient<Database>,
  userId: string,
  pageIds: string[],
): Promise<Map<string, LandingPageRow>> {
  const byId = new Map<string, LandingPageRow>();
  const uniqueIds = [...new Set(pageIds)];
  for (const chunk of chunkIds(uniqueIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("landing_pages")
      .select("id, label, url, page_type")
      .eq("user_id", userId)
      .in("id", chunk);
    if (error) continue;
    for (const row of data ?? []) {
      byId.set(row.id, row as LandingPageRow);
    }
  }
  return byId;
}

async function fetchMeaningfulChanges(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
  dateStartIso: string | null,
): Promise<{ rows: SnapshotRow[]; error?: string }> {
  const rows: SnapshotRow[] = [];

  for (const chunk of chunkIds(competitorIds, IN_CHUNK)) {
    let query = supabase
      .from("landing_page_snapshots")
      .select(
        "id, landing_page_id, competitor_id, screenshot_url, hero_screenshot_url, page_text, pixel_diff_pct, change_analysis, taken_at",
      )
      .eq("user_id", userId)
      .in("competitor_id", chunk)
      .eq("has_meaningful_change", true)
      .order("taken_at", { ascending: false });

    if (dateStartIso) {
      query = query.gte("taken_at", dateStartIso);
    }

    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    rows.push(...((data ?? []) as SnapshotRow[]));
  }

  rows.sort((a, b) => Date.parse(b.taken_at) - Date.parse(a.taken_at));
  return { rows };
}

async function enrichWithPreviousSnapshots(
  supabase: SupabaseClient<Database>,
  userId: string,
  snapshots: SnapshotRow[],
  pagesById: Map<string, LandingPageRow>,
  competitorById: Map<string, CompetitorRow>,
  clientBrandLabels: Map<string, string>,
): Promise<DiscoveryLandingPageChangeDto[]> {
  const enriched: DiscoveryLandingPageChangeDto[] = [];

  for (const snap of snapshots) {
    const page = pagesById.get(snap.landing_page_id);
    if (!page) continue;

    const competitor = competitorById.get(snap.competitor_id);
    if (!competitor) continue;

    const { data: prev } = await supabase
      .from("landing_page_snapshots")
      .select("screenshot_url, hero_screenshot_url, page_text, taken_at")
      .eq("landing_page_id", snap.landing_page_id)
      .eq("user_id", userId)
      .lt("taken_at", snap.taken_at)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    enriched.push({
      id: snap.id,
      landing_page_id: snap.landing_page_id,
      competitor_id: snap.competitor_id,
      competitor_name: competitorDisplayName(competitor),
      competitor_domain: competitor.brand_domain ?? null,
      competitor_logo_url: competitorLogo(competitor),
      client_brand_name: clientBrandLabels.get(snap.competitor_id) ?? null,
      url: page.url,
      label: page.label,
      page_type: page.page_type,
      taken_at: snap.taken_at,
      screenshot_url: snap.screenshot_url,
      hero_screenshot_url: snap.hero_screenshot_url,
      page_text: snap.page_text,
      pixel_diff_pct: snap.pixel_diff_pct,
      change_analysis: snap.change_analysis,
      prev_screenshot_url: prev?.screenshot_url ?? null,
      prev_hero_screenshot_url: prev?.hero_screenshot_url ?? null,
      prev_page_text: prev?.page_text ?? null,
      prev_taken_at: prev?.taken_at ?? null,
    });
  }

  return enriched;
}

function buildFilterCounts(
  changes: DiscoveryLandingPageChangeDto[],
): Record<DiscoveryLandingPagesQuery["changeFilter"], number> {
  const counts = {
    all: changes.length,
    permanent: 0,
    ab_test: 0,
    unknown: 0,
  };
  for (const change of changes) {
    const kind = getChangeKind(parseChangeAnalysis(change.change_analysis));
    counts[kind] += 1;
  }
  return counts;
}

function sortChanges(
  changes: DiscoveryLandingPageChangeDto[],
  sort: DiscoveryLandingPagesQuery["sort"],
): DiscoveryLandingPageChangeDto[] {
  const arr = [...changes];
  if (sort === "oldest") {
    arr.sort((a, b) => Date.parse(a.taken_at) - Date.parse(b.taken_at));
    return arr;
  }
  if (sort === "threat") {
    arr.sort((a, b) => {
      const diff = threatScore(b.change_analysis) - threatScore(a.change_analysis);
      if (diff !== 0) return diff;
      return Date.parse(b.taken_at) - Date.parse(a.taken_at);
    });
    return arr;
  }
  arr.sort((a, b) => Date.parse(b.taken_at) - Date.parse(a.taken_at));
  return arr;
}

function buildCompetitorChips(
  changes: DiscoveryLandingPageChangeDto[],
  competitorById: Map<string, CompetitorRow>,
): DiscoveryCompetitorChip[] {
  const counts = new Map<string, number>();
  for (const change of changes) {
    counts.set(change.competitor_id, (counts.get(change.competitor_id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, ad_count]) => {
      const row = competitorById.get(id);
      return {
        id,
        name: row ? competitorDisplayName(row) : "Competitor",
        domain: row?.brand_domain ?? null,
        logo_url: row ? competitorLogo(row) : null,
        ad_count,
      };
    })
    .sort((a, b) => b.ad_count - a.ad_count || a.name.localeCompare(b.name));
}

export async function buildDiscoveryLandingPagesFeed(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: DiscoveryLandingPagesQuery,
): Promise<DiscoveryLandingPagesResult> {
  const clientBrandIds =
    query.clientBrandIds.length > 0 ? query.clientBrandIds : [query.brandId];

  const { ids: scopeIds, error: scopeErr } = await loadCompetitorIdsForBrandIds(
    supabase,
    userId,
    clientBrandIds,
  );
  if (scopeErr) return { ok: false, error: scopeErr };
  if (scopeIds.length === 0) {
    return {
      ok: true,
      changes: [],
      total: 0,
      offset: query.offset,
      limit: query.limit,
      has_more: false,
      competitors: [],
      filter_counts: { all: 0, permanent: 0, ab_test: 0, unknown: 0 },
    };
  }

  let competitorIds = scopeIds;
  if (query.competitorFilterIds.length > 0) {
    const allowed = new Set(scopeIds);
    competitorIds = query.competitorFilterIds.filter((id) => allowed.has(id));
    if (competitorIds.length === 0) {
      return {
        ok: true,
        changes: [],
        total: 0,
        offset: query.offset,
        limit: query.limit,
        has_more: false,
        competitors: [],
        filter_counts: { all: 0, permanent: 0, ab_test: 0, unknown: 0 },
      };
    }
  }

  const nowMs = Date.now();
  const dateStartMs = datePresetStart(query.datePreset, nowMs);
  const dateStartIso = dateStartMs != null ? new Date(dateStartMs).toISOString() : null;

  const { rows, error: fetchErr } = await fetchMeaningfulChanges(
    supabase,
    userId,
    competitorIds,
    dateStartIso,
  );
  if (fetchErr) return { ok: false, error: fetchErr };

  const { rows: competitorRows, error: compErr } = await loadCompetitorsById(
    supabase,
    userId,
    competitorIds,
  );
  if (compErr) return { ok: false, error: compErr };

  const competitorById = new Map<string, CompetitorRow>(
    competitorRows.map((row) => [row.id, row as CompetitorRow]),
  );
  const clientBrandLabels = await loadCompetitorClientBrandLabels(supabase, userId, competitorIds);
  const pagesById = await fetchLandingPagesById(
    supabase,
    userId,
    rows.map((row) => row.landing_page_id),
  );

  let changes = await enrichWithPreviousSnapshots(
    supabase,
    userId,
    rows,
    pagesById,
    competitorById,
    clientBrandLabels,
  );

  if (query.query.trim()) {
    changes = changes.filter((change) => matchesSearch(change, query.query));
  }

  const filterCounts = buildFilterCounts(changes);

  if (query.changeFilter !== "all") {
    changes = changes.filter((change) =>
      matchesChangeFilter(parseChangeAnalysis(change.change_analysis), query.changeFilter),
    );
  }

  changes = sortChanges(changes, query.sort);

  const competitors = buildCompetitorChips(changes, competitorById);
  const total = changes.length;
  const page = changes.slice(query.offset, query.offset + query.limit);

  return {
    ok: true,
    changes: page,
    total,
    offset: query.offset,
    limit: query.limit,
    has_more: query.offset + page.length < total,
    competitors,
    filter_counts: filterCounts,
  };
}
