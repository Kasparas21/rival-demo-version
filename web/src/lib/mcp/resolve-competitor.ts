import type { SupabaseClient } from "@supabase/supabase-js";

import { McpToolError } from "@/lib/mcp/errors";
import type { Database } from "@/lib/supabase/types";

export type ResolvedCompetitor = {
  id: string;
  name: string;
  domain: string | null;
  lastScrapedAt: string | null;
};

export async function resolveCompetitor(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitor: string,
): Promise<ResolvedCompetitor | null> {
  const raw = competitor.trim();
  if (!raw) return null;

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRe.test(raw)) {
    const { data } = await supabase
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain, last_scraped_at")
      .eq("user_id", userId)
      .eq("id", raw)
      .eq("is_workspace_brand", false)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.brand_name?.trim() || data.name?.trim() || "Competitor",
      domain: data.brand_domain?.trim() || null,
      lastScrapedAt: data.last_scraped_at,
    };
  }

  const needle = raw.toLowerCase();
  const { data: rows } = await supabase
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, last_scraped_at")
    .eq("user_id", userId)
    .eq("is_workspace_brand", false);

  for (const row of rows ?? []) {
    const name = (row.brand_name?.trim() || row.name?.trim() || "").toLowerCase();
    const domain = (row.brand_domain?.trim() || "").toLowerCase();
    if (name === needle || name.includes(needle) || domain.includes(needle)) {
      return {
        id: row.id,
        name: row.brand_name?.trim() || row.name?.trim() || "Competitor",
        domain: row.brand_domain?.trim() || null,
        lastScrapedAt: row.last_scraped_at,
      };
    }
  }

  return null;
}

export async function requireCompetitor(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitor: string,
): Promise<ResolvedCompetitor> {
  const resolved = await resolveCompetitor(supabase, userId, competitor);
  if (!resolved) {
    throw new McpToolError("not_tracked", `competitor "${competitor.trim()}" is not tracked.`);
  }
  return resolved;
}
