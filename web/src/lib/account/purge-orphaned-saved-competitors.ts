import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Deletes `saved_competitors` rows that are not linked to any brand workspace
 * (and are not the user's workspace brand). Prevents weekly cron from scraping
 * competitors left behind after brand deletion or partial removal.
 */
export async function purgeOrphanedSavedCompetitorsForUser(
  admin: AdminClient,
  userId: string,
): Promise<{ purgedIds: string[]; mappingsUnavailable: boolean }> {
  const { data: savedRows, error: savedErr } = await admin
    .from("saved_competitors")
    .select("id, is_workspace_brand")
    .eq("user_id", userId);

  if (savedErr) {
    throw new Error(savedErr.message);
  }

  const candidates = (savedRows ?? []).filter((row) => !row.is_workspace_brand);
  if (candidates.length === 0) {
    return { purgedIds: [], mappingsUnavailable: false };
  }

  const { data: mappings, error: mapErr } = await admin
    .from("brand_competitors")
    .select("competitor_id")
    .eq("user_id", userId);

  if (mapErr && /brand_competitors/i.test(mapErr.message)) {
    return { purgedIds: [], mappingsUnavailable: true };
  }
  if (mapErr) {
    throw new Error(mapErr.message);
  }

  const mappedIds = new Set((mappings ?? []).map((row) => String(row.competitor_id ?? "")));
  const orphanIds = candidates
    .map((row) => String(row.id ?? ""))
    .filter((id) => id && !mappedIds.has(id));

  if (orphanIds.length === 0) {
    return { purgedIds: [], mappingsUnavailable: false };
  }

  const { error: delErr } = await admin
    .from("saved_competitors")
    .delete()
    .eq("user_id", userId)
    .in("id", orphanIds);

  if (delErr) {
    throw new Error(delErr.message);
  }

  return { purgedIds: orphanIds, mappingsUnavailable: false };
}
