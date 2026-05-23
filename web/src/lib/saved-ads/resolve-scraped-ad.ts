import type { SupabaseClient } from "@supabase/supabase-js";

import { metaScrapedRowMatchesLibraryItemId } from "@/lib/ad-library/meta-library-item-keys";
import type { MetaAdCard } from "@/lib/ad-library/normalize";
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

/** Match a persisted saved_ads row to an ad-library card id (fallback when scraped_ads lookup misses). */
export function savedRowMatchesLibraryItem(
  row: { platform: string; raw_payload: unknown },
  item: { platform: string; libraryItemId: string },
): boolean {
  const pl = item.platform.trim().toLowerCase();
  const rowPl = String(row.platform).trim().toLowerCase();
  if (pl !== rowPl) return false;

  const payload = row.raw_payload;
  if (pl === "meta" && payload && typeof payload === "object" && !Array.isArray(payload)) {
    return metaScrapedRowMatchesLibraryItemId(payload as MetaAdCard, item.libraryItemId);
  }

  const cardId = libraryItemIdFromRawPayload(payload);
  return Boolean(cardId && cardId === item.libraryItemId.trim());
}
