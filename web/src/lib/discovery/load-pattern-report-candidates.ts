import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type PatternReportCandidate = {
  user_id: string;
  brand_id: string;
  brand_name: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Distinct (user_id, brand_id) workspaces that have tracked competitors.
 * Includes real brand rows plus users with saved competitors but no brand rows.
 */
export async function loadPatternReportCandidates(
  admin: SupabaseClient<Database>,
): Promise<PatternReportCandidate[]> {
  const byKey = new Map<string, PatternReportCandidate>();

  const { data: brands, error: brandsErr } = await admin.from("brands").select("id, user_id, name");
  if (brandsErr) throw new Error(brandsErr.message);

  for (const brand of brands ?? []) {
    byKey.set(`${brand.user_id}:${brand.id}`, {
      user_id: brand.user_id,
      brand_id: brand.id,
      brand_name: brand.name,
    });
  }

  const { data: competitors, error: compErr } = await admin
    .from("saved_competitors")
    .select("user_id")
    .eq("is_workspace_brand", false);

  if (compErr) throw new Error(compErr.message);

  const usersWithCompetitors = new Set((competitors ?? []).map((r) => r.user_id));
  for (const userId of usersWithCompetitors) {
    const hasBrand = [...byKey.values()].some((c) => c.user_id === userId && UUID_RE.test(c.brand_id));
    if (!hasBrand) {
      byKey.set(`${userId}:default`, {
        user_id: userId,
        brand_id: "default",
        brand_name: "Workspace",
      });
    }
  }

  return [...byKey.values()].sort(
    (a, b) => a.user_id.localeCompare(b.user_id) || a.brand_id.localeCompare(b.brand_id),
  );
}
