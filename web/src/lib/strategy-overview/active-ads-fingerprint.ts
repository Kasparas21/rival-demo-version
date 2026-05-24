import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type ActiveAdsFingerprintStats = {
  activeCount: number;
  maxLastSeenAt: string | null;
  maxCreatedAt: string | null;
};

/** Stable string for cache invalidation — changes when active ad rows are added/removed or seen timestamps move. */
export function formatActiveAdsFingerprint(stats: ActiveAdsFingerprintStats): string {
  const count = stats.activeCount;
  const lastSeen = stats.maxLastSeenAt?.trim() || "0";
  const created = stats.maxCreatedAt?.trim() || "0";
  return `${count}:${lastSeen}:${created}`;
}

export const EMPTY_ACTIVE_ADS_FINGERPRINT = formatActiveAdsFingerprint({
  activeCount: 0,
  maxLastSeenAt: null,
  maxCreatedAt: null,
});

/**
 * Index-supported aggregate over active scraped ads (uses scraped_ads_user_competitor_active_idx).
 * Enrichment-only updates do not change count or max(last_seen_at) / max(created_at).
 */
export async function computeActiveAdsFingerprint(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string
): Promise<string> {
  const stats = await loadActiveAdsFingerprintStats(supabase, userId, competitorId);
  return formatActiveAdsFingerprint(stats);
}

export async function loadActiveAdsFingerprintStats(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string
): Promise<ActiveAdsFingerprintStats> {
  const [{ count, error: countErr }, lastSeenRes, createdRes] = await Promise.all([
    supabase
      .from("scraped_ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("competitor_id", competitorId)
      .eq("is_active", true),
    supabase
      .from("scraped_ads")
      .select("last_seen_at")
      .eq("user_id", userId)
      .eq("competitor_id", competitorId)
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scraped_ads")
      .select("created_at")
      .eq("user_id", userId)
      .eq("competitor_id", competitorId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (countErr) {
    console.warn("[active-ads-fingerprint] count", countErr.message);
  }

  return {
    activeCount: count ?? 0,
    maxLastSeenAt: lastSeenRes.data?.last_seen_at ?? null,
    maxCreatedAt: createdRes.data?.created_at ?? null,
  };
}
