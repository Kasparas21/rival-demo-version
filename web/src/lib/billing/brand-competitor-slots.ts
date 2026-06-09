import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";

type ServerSupabase = SupabaseClient<Database>;

/**
 * Watched competitor "slots" = rows in `brand_competitors` whose linked `saved_competitors`
 * row is not a workspace brand. Same competitor mapped to two brands counts as two slots.
 *
 * If `brand_competitors` is missing or errors, falls back to counting non-workspace `saved_competitors` rows (legacy).
 */
export async function countWatchedCompetitorSlotsForUser(
  supabase: ServerSupabase,
  userId: string,
): Promise<{ count: number; usedBrandMappingsTable: boolean }> {
  const { data: mappings, error: mapErr } = await supabase
    .from("brand_competitors")
    .select("competitor_id")
    .eq("user_id", userId);

  if (
    mapErr &&
    (isMissingDbColumnError(mapErr.message, "brand_competitors") || /brand_competitors/i.test(mapErr.message))
  ) {
    const { count, error: legacyErr } = await supabase
      .from("saved_competitors")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_workspace_brand", false);
    if (legacyErr && isMissingDbColumnError(legacyErr.message, "is_workspace_brand")) {
      const { count: c2 } = await supabase
        .from("saved_competitors")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return { count: c2 ?? 0, usedBrandMappingsTable: false };
    }
    if (legacyErr) throw legacyErr;
    return { count: count ?? 0, usedBrandMappingsTable: false };
  }
  if (mapErr) throw mapErr;

  const rows = mappings ?? [];
  if (rows.length === 0) return { count: 0, usedBrandMappingsTable: true };

  const competitorIds = [...new Set(rows.map((r) => String(r.competitor_id ?? "")).filter(Boolean))];
  const { data: savedRows, error: savedErr } = await supabase
    .from("saved_competitors")
    .select("id, is_workspace_brand")
    .eq("user_id", userId)
    .in("id", competitorIds);

  if (savedErr && isMissingDbColumnError(savedErr.message, "is_workspace_brand")) {
    return { count: rows.length, usedBrandMappingsTable: true };
  }
  if (savedErr) throw savedErr;

  const workspaceIds = new Set(
    (savedRows ?? []).filter((r) => Boolean(r.is_workspace_brand)).map((r) => String(r.id)),
  );
  const slots = rows.filter((r) => {
    const id = String(r.competitor_id ?? "");
    return id && !workspaceIds.has(id);
  }).length;

  return { count: slots, usedBrandMappingsTable: true };
}
