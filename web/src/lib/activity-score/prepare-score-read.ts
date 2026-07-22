import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { tryHydrateScrapedAdsFromAdsCache } from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";

type ScoreRow = Database["public"]["Tables"]["competitor_activity_scores"]["Row"];

export async function countScrapedAdsForCompetitor(
  db: SupabaseClient<Database>,
  userId: string,
  competitorId: string
): Promise<number> {
  const { count, error } = await db
    .from("scraped_ads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("competitor_id", competitorId);

  if (error) {
    console.error("[activity-score] scraped_ads count failed", error.message);
    return 0;
  }
  return count ?? 0;
}

export function competitorDomainHint(competitor: {
  brand_domain: string | null;
  slug: string;
}): string {
  return competitor.brand_domain?.trim() || competitor.slug?.trim() || "";
}

/** Cached row was computed before ads existed — common after first scrape. */
export function cachedScoreLooksStale(row: ScoreRow, liveAdsCount: number): boolean {
  if (liveAdsCount < 3) return false;
  return row.confidence === "insufficient" || row.ads_count_at_calc < 3;
}

/**
 * When row-level `scraped_ads` lag behind `ads_cache`, hydrate before scoring so the
 * activity score matches what Ad Library already shows.
 */
export async function ensureScrapedAdsForActivityScore(params: {
  userId: string;
  competitorId: string;
  domainHint: string;
  liveAdsCount: number;
}): Promise<number> {
  const { userId, competitorId, domainHint } = params;
  let liveAdsCount = params.liveAdsCount;
  if (liveAdsCount >= 3 || !domainHint.trim()) return liveAdsCount;

  const admin = createSupabaseAdminClient();
  try {
    const hydrate = await tryHydrateScrapedAdsFromAdsCache(admin, {
      userId,
      competitorId,
      domainHint,
    });
    if (hydrate.ok && hydrate.rowsInserted > 0) {
      liveAdsCount = await countScrapedAdsForCompetitor(admin, userId, competitorId);
    }
  } catch (err) {
    console.error("[activity-score] hydrate from ads_cache failed", err);
  }
  return liveAdsCount;
}
