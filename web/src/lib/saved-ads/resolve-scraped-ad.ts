import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export function libraryItemIdFromRawPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

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

  if (error || !data?.id) {
    const { data: byKey, error: keyErr } = await supabase
      .from("scraped_ads")
      .select("id")
      .eq("user_id", userId)
      .eq("competitor_id", competitorId)
      .eq("platform", pl)
      .eq("stable_ad_key", lid)
      .maybeSingle();
    if (keyErr || !byKey?.id) return null;
    return byKey.id;
  }
  return data.id;
}

export function libraryItemKey(platform: string, libraryItemId: string): string {
  return `${platform.trim().toLowerCase()}:${libraryItemId.trim()}`;
}
