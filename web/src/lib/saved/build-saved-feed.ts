import type { SupabaseClient } from "@supabase/supabase-js";

import { isWorkspaceBrandSavedAdsDebugEnabled } from "@/lib/saved-ads/workspace-brand-saved-access";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import type { Database, Json } from "@/lib/supabase/types";

import type {
  SavedCompetitorChip,
  SavedFeedItem,
  SavedFeedQuery,
  SavedFeedResult,
  SavedTypeCounts,
} from "./types";

const IN_CHUNK = 40;
const FETCH_CAP = 2000;
const DAY_MS = 86_400_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CompetitorRow = {
  id: string;
  name: string | null;
  brand_name: string | null;
  brand_domain: string | null;
  logo_url: string | null;
  brand_logo_url: string | null;
  is_workspace_brand: boolean | null;
};

function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function normalizePlatform(platform: string | null | undefined): string {
  return (platform ?? "").trim().toLowerCase();
}

function isVideoFormat(format: string | null | undefined): boolean {
  const f = (format ?? "").trim().toLowerCase();
  return f.includes("video") || f === "reel" || f === "carousel_video";
}

function datePresetStart(preset: SavedFeedQuery["datePreset"], nowMs: number): number | null {
  if (preset === "all") return null;
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return nowMs - days * DAY_MS;
}

function competitorMeta(comp: CompetitorRow) {
  return {
    competitor_name: comp.brand_name?.trim() || comp.name?.trim() || "Competitor",
    competitor_domain: comp.brand_domain?.trim() || null,
    competitor_logo_url: comp.brand_logo_url?.trim() || comp.logo_url?.trim() || null,
  };
}

function adsAllowedForCompetitor(comp: CompetitorRow): boolean {
  if (isWorkspaceBrandSavedAdsDebugEnabled()) return true;
  return comp.is_workspace_brand !== true;
}

async function loadCompetitorIdsForBrand(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
): Promise<{ ids: string[]; error?: string }> {
  const isRealBrandId = UUID_RE.test(brandId.trim());

  if (isRealBrandId) {
    const { data: mappings, error: mapErr } = await supabase
      .from("brand_competitors")
      .select("competitor_id")
      .eq("user_id", userId)
      .eq("brand_id", brandId);

    if (
      mapErr &&
      !(
        isMissingDbColumnError(mapErr.message, "brand_competitors") ||
        /brand_competitors/i.test(mapErr.message)
      )
    ) {
      return { ids: [], error: mapErr.message };
    }

    const mappedIds = [...new Set((mappings ?? []).map((r) => String(r.competitor_id)).filter(Boolean))];
    if (mappedIds.length > 0) return { ids: mappedIds };
  }

  const { data: rows, error: rowsErr } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("user_id", userId)
    .eq("is_workspace_brand", false);

  if (rowsErr) return { ids: [], error: rowsErr.message };
  return { ids: (rows ?? []).map((r) => r.id) };
}

async function loadCompetitorsById(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
): Promise<{ rows: CompetitorRow[]; error?: string }> {
  const rows: CompetitorRow[] = [];
  for (const chunk of chunkIds(competitorIds, IN_CHUNK)) {
    let { data, error } = await supabase
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain, logo_url, brand_logo_url, is_workspace_brand")
      .eq("user_id", userId)
      .in("id", chunk);

    if (error && isMissingDbColumnError(error.message, "is_workspace_brand")) {
      ({ data, error } = await supabase
        .from("saved_competitors")
        .select("id, name, brand_name, brand_domain, logo_url, brand_logo_url")
        .eq("user_id", userId)
        .in("id", chunk));
    }

    if (error) return { rows: [], error: error.message };
    for (const row of data ?? []) {
      rows.push({
        ...row,
        is_workspace_brand:
          "is_workspace_brand" in row ? (row as CompetitorRow).is_workspace_brand : false,
      });
    }
  }
  return { rows };
}

function matchesSearch(item: SavedFeedItem, needle: string): boolean {
  if (!needle) return true;
  const parts: string[] = [item.competitor_name];
  switch (item.item_type) {
    case "ad":
      parts.push(item.ad_text, item.ai_extracted_angle ?? "", item.notes ?? "", item.platform);
      break;
    case "email":
      parts.push(
        item.subject ?? "",
        item.from_name ?? "",
        item.from_email ?? "",
        item.preview_text ?? "",
        item.ai_summary ?? "",
      );
      break;
    case "organic":
      parts.push(item.content ?? "", item.platform, item.author_display_name ?? "");
      break;
    case "landing":
      parts.push(item.label, item.url, item.page_type ?? "");
      break;
  }
  return parts.join(" ").toLowerCase().includes(needle);
}

function filterItem(
  item: SavedFeedItem,
  input: SavedFeedQuery,
  dateStart: number | null,
  platformSet: Set<string>,
  needle: string,
): boolean {
  if (input.itemType !== "all" && item.item_type !== input.itemType) return false;
  if (input.competitorId && item.competitor_id !== input.competitorId) return false;

  const savedMs = new Date(item.saved_at).getTime();
  if (dateStart != null && savedMs < dateStart) return false;

  if (platformSet.size > 0) {
    const pl =
      item.item_type === "ad" || item.item_type === "organic"
        ? normalizePlatform(item.platform)
        : "";
    if (!pl || !platformSet.has(pl)) return false;
  }

  if (input.format !== "all" && item.item_type === "ad") {
    const isVideo = isVideoFormat(item.format);
    if (input.format === "video" && !isVideo) return false;
    if (input.format === "image" && isVideo) return false;
  }

  return matchesSearch(item, needle);
}

export async function buildSavedFeed(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: SavedFeedQuery,
): Promise<SavedFeedResult | { ok: false; error: string }> {
  const { ids: competitorIds, error: competitorIdsError } = await loadCompetitorIdsForBrand(
    supabase,
    userId,
    input.brandId,
  );
  if (competitorIdsError) return { ok: false, error: competitorIdsError };

  if (!competitorIds.length) {
    return {
      ok: true,
      items: [],
      total: 0,
      offset: input.offset,
      limit: input.limit,
      has_more: false,
      competitors: [],
      type_counts: { ads: 0, emails: 0, organic: 0, landings: 0, total: 0 },
      platform_counts: {},
    };
  }

  const { rows: competitors, error: compErr } = await loadCompetitorsById(supabase, userId, competitorIds);
  if (compErr) return { ok: false, error: compErr };

  const compById = new Map(competitors.map((c) => [c.id, c]));
  const scopedIds = input.competitorId
    ? competitorIds.filter((id) => id === input.competitorId)
    : competitorIds;

  const adCompetitorIds = scopedIds.filter((id) => {
    const comp = compById.get(id);
    return comp ? adsAllowedForCompetitor(comp) : true;
  });

  const allItems: SavedFeedItem[] = [];

  for (const chunk of chunkIds(scopedIds, IN_CHUNK)) {
    const adChunk = chunk.filter((id) => adCompetitorIds.includes(id));
    const [adsRes, emailsRes, organicRes, landingsRes] = await Promise.all([
      adChunk.length
        ? supabase
            .from("saved_ads")
            .select(
              "id, competitor_id, platform, format, ad_text, notes, ai_extracted_angle, saved_at, source_scraped_ad_id, raw_payload",
            )
            .eq("user_id", userId)
            .in("competitor_id", adChunk)
            .order("saved_at", { ascending: false })
            .limit(FETCH_CAP)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("saved_emails")
        .select(
          "id, competitor_id, subject, from_email, from_name, preview_text, email_type, ai_summary, received_at, saved_at, source_competitor_email_id",
        )
        .eq("user_id", userId)
        .in("competitor_id", chunk)
        .order("saved_at", { ascending: false })
        .limit(FETCH_CAP),
      supabase
        .from("saved_organic_posts")
        .select(
          "id, competitor_id, platform, content, media_urls, likes, comments, shares, views, posted_at, post_url, author_display_name, saved_at",
        )
        .eq("user_id", userId)
        .in("competitor_id", chunk)
        .order("saved_at", { ascending: false })
        .limit(FETCH_CAP),
      supabase
        .from("saved_landing_pages")
        .select("id, competitor_id, url, label, page_type, screenshot_url, hero_screenshot_url, saved_at")
        .eq("user_id", userId)
        .in("competitor_id", chunk)
        .order("saved_at", { ascending: false })
        .limit(FETCH_CAP),
    ]);

    const firstError = adsRes.error ?? emailsRes.error ?? organicRes.error ?? landingsRes.error;
    if (firstError) return { ok: false, error: firstError.message };

    for (const row of adsRes.data ?? []) {
      const comp = compById.get(row.competitor_id);
      if (!comp) continue;
      allItems.push({
        item_type: "ad",
        id: row.id,
        saved_at: row.saved_at,
        competitor_id: row.competitor_id,
        ...competitorMeta(comp),
        platform: row.platform,
        format: row.format ?? "",
        ad_text: row.ad_text ?? "",
        source_scraped_ad_id: row.source_scraped_ad_id,
        raw_payload: (row.raw_payload ?? {}) as Json,
        notes: row.notes,
        ai_extracted_angle: row.ai_extracted_angle,
      });
    }

    for (const row of emailsRes.data ?? []) {
      const comp = compById.get(row.competitor_id);
      if (!comp) continue;
      allItems.push({
        item_type: "email",
        id: row.id,
        saved_at: row.saved_at,
        competitor_id: row.competitor_id,
        ...competitorMeta(comp),
        subject: row.subject,
        from_email: row.from_email,
        from_name: row.from_name,
        preview_text: row.preview_text,
        email_type: row.email_type,
        ai_summary: row.ai_summary,
        received_at: row.received_at,
        source_competitor_email_id: row.source_competitor_email_id,
      });
    }

    for (const row of organicRes.data ?? []) {
      const comp = compById.get(row.competitor_id);
      if (!comp) continue;
      allItems.push({
        item_type: "organic",
        id: row.id,
        saved_at: row.saved_at,
        competitor_id: row.competitor_id,
        ...competitorMeta(comp),
        platform: row.platform,
        content: row.content,
        media_urls: row.media_urls ?? [],
        likes: row.likes ?? 0,
        comments: row.comments ?? 0,
        shares: row.shares ?? 0,
        views: row.views ?? 0,
        posted_at: row.posted_at,
        post_url: row.post_url,
        author_display_name: row.author_display_name,
      });
    }

    for (const row of landingsRes.data ?? []) {
      const comp = compById.get(row.competitor_id);
      if (!comp) continue;
      allItems.push({
        item_type: "landing",
        id: row.id,
        saved_at: row.saved_at,
        competitor_id: row.competitor_id,
        ...competitorMeta(comp),
        url: row.url,
        label: row.label ?? row.url,
        page_type: row.page_type,
        screenshot_url: row.screenshot_url,
        hero_screenshot_url: row.hero_screenshot_url,
      });
    }
  }

  const nowMs = Date.now();
  const dateStart = datePresetStart(input.datePreset, nowMs);
  const platformSet = new Set(input.platforms.map(normalizePlatform).filter(Boolean));
  const needle = input.query.trim().toLowerCase();

  const filtered = allItems.filter((item) => filterItem(item, input, dateStart, platformSet, needle));

  const filteredForTypeCounts = allItems.filter((item) =>
    filterItem(
      { ...input, itemType: "all" },
      dateStart,
      platformSet,
      needle,
    ),
  );

  const type_counts: SavedTypeCounts = {
    ads: filteredForTypeCounts.filter((i) => i.item_type === "ad").length,
    emails: filteredForTypeCounts.filter((i) => i.item_type === "email").length,
    organic: filteredForTypeCounts.filter((i) => i.item_type === "organic").length,
    landings: filteredForTypeCounts.filter((i) => i.item_type === "landing").length,
    total: filteredForTypeCounts.length,
  };

  const platform_counts: Record<string, number> = {};
  for (const item of filtered) {
    if (item.item_type === "ad" || item.item_type === "organic") {
      const pl = normalizePlatform(item.platform);
      if (pl) platform_counts[pl] = (platform_counts[pl] ?? 0) + 1;
    }
  }

  const competitorCounts = new Map<string, number>();
  for (const item of filtered) {
    competitorCounts.set(item.competitor_id, (competitorCounts.get(item.competitor_id) ?? 0) + 1);
  }

  const competitorChips: SavedCompetitorChip[] = competitors
    .filter((c) => (competitorCounts.get(c.id) ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      name: c.brand_name?.trim() || c.name?.trim() || "Competitor",
      domain: c.brand_domain?.trim() || null,
      logo_url: c.brand_logo_url?.trim() || c.logo_url?.trim() || null,
      item_count: competitorCounts.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.item_count - a.item_count);

  filtered.sort((a, b) => {
    const aMs = new Date(a.saved_at).getTime();
    const bMs = new Date(b.saved_at).getTime();
    return input.sort === "oldest" ? aMs - bMs : bMs - aMs;
  });

  const page = filtered.slice(input.offset, input.offset + input.limit);

  return {
    ok: true,
    items: page,
    total: filtered.length,
    offset: input.offset,
    limit: input.limit,
    has_more: input.offset + page.length < filtered.length,
    competitors: competitorChips,
    type_counts,
    platform_counts,
  };
}
