import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** PostgREST default max rows per request (project-configurable; paginate past this). */
const SUPABASE_PAGE_SIZE = 1000;
const IN_CHUNK = 40;

export function chunkDiscoveryIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export type DiscoveryScrapedAdRow = {
  id: string;
  competitor_id: string;
  platform: string;
  format: string | null;
  ad_text: string | null;
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean | null;
  raw_payload?: unknown;
  ai_extracted_angle?: string | null;
  ai_extracted_launch_date?: string | null;
};

/**
 * Load every Meta scraped_ad for the given competitors (no row cap).
 * Paginates past PostgREST's per-request limit.
 */
export async function fetchAllDiscoveryScrapedAds(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
  select: string,
): Promise<{ rows: DiscoveryScrapedAdRow[]; error?: string }> {
  if (!competitorIds.length) return { rows: [] };

  const byId = new Map<string, DiscoveryScrapedAdRow>();

  const fetchPage = async (chunk: string[], selectCols: string, from: number) =>
    supabase
      .from("scraped_ads")
      .select(selectCols)
      .eq("user_id", userId)
      .eq("platform", "meta")
      .in("competitor_id", chunk)
      .order("last_seen_at", { ascending: false })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

  for (const chunk of chunkDiscoveryIds(competitorIds, IN_CHUNK)) {
    let selectCols = select;
    let from = 0;

    while (true) {
      let { data, error } = await fetchPage(chunk, selectCols, from);

      if (
        error &&
        selectCols.includes("archived_creative_url") &&
        isMissingDbColumnError(error.message, "archived_creative_url")
      ) {
        selectCols = selectCols.replace(", archived_creative_url", "").replace("archived_creative_url, ", "");
        ({ data, error } = await fetchPage(chunk, selectCols, from));
      }

      if (
        error &&
        (isMissingDbColumnError(error.message, "ai_extracted_angle") ||
          isMissingDbColumnError(error.message, "ai_extracted_launch_date"))
      ) {
        selectCols = selectCols
          .replace(", ai_extracted_angle", "")
          .replace("ai_extracted_angle, ", "")
          .replace(", ai_extracted_launch_date", "")
          .replace("ai_extracted_launch_date, ", "");
        ({ data, error } = await fetchPage(chunk, selectCols, from));
      }

      if (error) return { rows: [], error: error.message };

      const page = (data ?? []) as unknown as DiscoveryScrapedAdRow[];
      for (const row of page) {
        if (!row?.id) continue;
        byId.set(row.id, {
          ...row,
          archived_creative_url: row.archived_creative_url ?? null,
        });
      }

      if (page.length < SUPABASE_PAGE_SIZE) break;
      from += SUPABASE_PAGE_SIZE;
    }
  }

  const rows = [...byId.values()].sort(
    (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime(),
  );

  return { rows };
}
