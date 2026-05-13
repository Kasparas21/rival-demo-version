import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/** Match library card `id` stored in scraped_ads.raw_payload (see persist-scraped-ads). */
export async function resolveScrapedAdIdForLibraryItem(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  platform: string,
  libraryItemId: string,
): Promise<string | null> {
  const pl = platform.trim().toLowerCase();
  const lid = libraryItemId.trim();
  if (!competitorId || !pl || !lid) return null;

  const { data, error } = await supabase
    .from("scraped_ads")
    .select("id")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("platform", pl)
    .filter("raw_payload->>id", "eq", lid)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}

export function libraryItemKey(platform: string, libraryItemId: string): string {
  return `${platform.trim().toLowerCase()}:${libraryItemId.trim()}`;
}
