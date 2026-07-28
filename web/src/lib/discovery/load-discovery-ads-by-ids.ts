import type { SupabaseClient } from "@supabase/supabase-js";

import { extractImpressionsIndex } from "@/lib/ad-library/ad-performance-ranking";
import { resolveTimelineAdKilled } from "@/lib/timeline/resolve-timeline-ad-killed";
import { chunkDiscoveryIds, type DiscoveryScrapedAdRow } from "@/lib/discovery/fetch-discovery-scraped-ads";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import type { Database } from "@/lib/supabase/types";

type CompetitorRow = {
  id: string;
  name: string | null;
  brand_name: string | null;
  brand_domain: string | null;
  logo_url: string | null;
  brand_logo_url: string | null;
  last_scraped_at: string | null;
};

const IN_CHUNK = 40;

export async function loadDiscoveryAdsByIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  adIds: string[],
): Promise<DiscoveryAdDto[]> {
  const uniqueIds = [...new Set(adIds.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const rows: DiscoveryScrapedAdRow[] = [];
  for (const chunk of chunkDiscoveryIds(uniqueIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("scraped_ads")
      .select(
        "id, competitor_id, platform, format, ad_text, ad_creative_url, archived_creative_url, first_seen_at, last_seen_at, is_active, raw_payload",
      )
      .eq("user_id", userId)
      .in("id", chunk);
    if (error) continue;
    for (const row of data ?? []) {
      if (row?.id) rows.push(row as DiscoveryScrapedAdRow);
    }
  }

  if (!rows.length) return [];

  const competitorIds = [...new Set(rows.map((r) => r.competitor_id))];
  const compById = new Map<string, CompetitorRow>();
  for (const chunk of chunkDiscoveryIds(competitorIds, IN_CHUNK)) {
    const { data } = await supabase
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain, logo_url, brand_logo_url, last_scraped_at")
      .eq("user_id", userId)
      .in("id", chunk);
    for (const c of data ?? []) compById.set(c.id, c as CompetitorRow);
  }

  const nowMs = Date.now();
  const dtos: DiscoveryAdDto[] = [];

  for (const row of rows) {
    const comp = compById.get(row.competitor_id);
    if (!comp) continue;
    const platform = (row.platform ?? "meta").trim().toLowerCase();
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

    dtos.push({
      id: row.id,
      competitor_id: row.competitor_id,
      competitor_name: comp.brand_name?.trim() || comp.name?.trim() || "Competitor",
      competitor_domain: comp.brand_domain?.trim() || null,
      competitor_logo_url: comp.brand_logo_url?.trim() || comp.logo_url?.trim() || null,
      platform,
      format: row.format ?? "",
      ad_text: row.ad_text ?? "",
      ad_creative_url: row.ad_creative_url,
      archived_creative_url: row.archived_creative_url ?? null,
      first_seen_at: row.first_seen_at,
      last_seen_at: row.last_seen_at,
      is_active: row.is_active ?? true,
      is_killed,
      impressions_index: extractImpressionsIndex(row.raw_payload ?? null),
      is_ultimate_winner: false,
      raw_payload: (row.raw_payload ?? {}) as DiscoveryAdDto["raw_payload"],
    });
  }

  const order = new Map(uniqueIds.map((id, i) => [id, i]));
  dtos.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  return dtos;
}
