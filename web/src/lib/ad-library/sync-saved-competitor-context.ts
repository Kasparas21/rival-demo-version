import type { SupabaseClient } from "@supabase/supabase-js";
import { filterPlatformIdsToEnabledChannels } from "./channels-to-platforms";
import type { AdsLibraryIds } from "./run-ads-library-parallel-scrape";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import { resolveAdsCacheDomainForUser } from "./competitor-cache-domain";
import type { Database, Json } from "@/lib/supabase/types";

/** Merge Apify ids + channel list onto `saved_competitors.ads_library_context` before / during scrape. */
export async function syncSavedCompetitorLibraryContext(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    domainHint: string;
    ids?: AdsLibraryIds;
    channels?: string[];
    confirmed?: boolean;
  }
): Promise<string | null> {
  const domainHint = params.domainHint.trim();
  if (!domainHint) return null;

  await ensureSavedCompetitorForStrategyOverview(supabase, params.userId, domainHint);
  const { competitorId } = await resolveAdsCacheDomainForUser(supabase, params.userId, domainHint);
  if (!competitorId) return null;

  const { data: row } = await supabase
    .from("saved_competitors")
    .select("ads_library_context")
    .eq("id", competitorId)
    .eq("user_id", params.userId)
    .maybeSingle();

  const prev =
    row?.ads_library_context && typeof row.ads_library_context === "object" && !Array.isArray(row.ads_library_context)
      ? (row.ads_library_context as Record<string, unknown>)
      : {};

  const prevIds =
    prev.ids && typeof prev.ids === "object" && !Array.isArray(prev.ids)
      ? (prev.ids as Record<string, string>)
      : {};

  const channels =
    params.channels?.length
      ? params.channels
      : Array.isArray(prev.channels)
        ? (prev.channels as string[])
        : undefined;

  let mergedIds = { ...prevIds };
  if (params.ids) {
    for (const [k, v] of Object.entries(params.ids)) {
      if (typeof v === "string" && v.trim()) mergedIds[k] = v.trim();
    }
  }
  if (channels?.length) {
    const filtered = filterPlatformIdsToEnabledChannels(mergedIds, channels.join(","));
    mergedIds = filtered ?? {};
  }

  const nextContext: Record<string, Json> = {
    ...(Object.keys(mergedIds).length > 0 ? { ids: mergedIds as Json } : {}),
    ...(channels?.length ? { channels: channels as Json } : {}),
    confirmed: params.confirmed ?? (typeof prev.confirmed === "boolean" ? prev.confirmed : true),
  };

  const { error } = await supabase
    .from("saved_competitors")
    .update({
      ads_library_context: nextContext as Json,
      pending: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", competitorId)
    .eq("user_id", params.userId);

  if (error) {
    console.error("[syncSavedCompetitorLibraryContext]", error.message);
  }

  return competitorId;
}
