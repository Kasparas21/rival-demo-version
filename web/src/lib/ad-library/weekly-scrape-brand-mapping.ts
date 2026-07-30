import type { Database } from "@/lib/supabase/types";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ScheduledScrapeRow = Database["public"]["Tables"]["saved_competitors"]["Row"];
type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Weekly cron should only refresh competitors still attached to a brand workspace
 * (or the workspace brand row itself). Orphan `saved_competitors` rows are skipped.
 *
 * When `brand_competitors` is unavailable (legacy installs), all rows pass through.
 */
export async function filterWeeklyScrapeRowsWithBrandMapping(
  admin: AdminClient,
  rows: ScheduledScrapeRow[],
): Promise<ScheduledScrapeRow[]> {
  if (rows.length === 0) return rows;

  const competitorIds = [...new Set(rows.map((row) => row.id).filter(Boolean))];
  const { data: mappings, error } = await admin
    .from("brand_competitors")
    .select("competitor_id")
    .in("competitor_id", competitorIds);

  if (error && /brand_competitors/i.test(error.message)) {
    return rows;
  }
  if (error) {
    throw new Error(error.message);
  }

  const mappedIds = new Set((mappings ?? []).map((row) => String(row.competitor_id ?? "")));
  return rows.filter((row) => Boolean(row.is_workspace_brand) || mappedIds.has(row.id));
}
