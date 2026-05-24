import type { SupabaseClient } from "@supabase/supabase-js";

import type { Json } from "@/lib/supabase/types";
import type { Database } from "@/lib/supabase/types";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { computeActiveAdsFingerprint } from "@/lib/strategy-overview/active-ads-fingerprint";
import {
  STRATEGY_OVERVIEW_MODEL_VERSION,
  getLatestScrapeBatchId,
} from "@/lib/strategy-overview/recompute-strategy-overview";

/** In-flight derive dedupe within a warm serverless instance. */
const inFlightDerives = new Map<string, Promise<CompetitorStrategyOverviewPayload | null>>();

export function deriveDedupeKey(userId: string, competitorId: string): string {
  return `${userId}:${competitorId}`;
}

/** Await an in-flight derive for this competitor instead of starting another. */
export function awaitInFlightDerive(
  userId: string,
  competitorId: string
): Promise<CompetitorStrategyOverviewPayload | null> | null {
  return inFlightDerives.get(deriveDedupeKey(userId, competitorId)) ?? null;
}

export function registerInFlightDerive(
  userId: string,
  competitorId: string,
  promise: Promise<CompetitorStrategyOverviewPayload | null>
): void {
  const key = deriveDedupeKey(userId, competitorId);
  inFlightDerives.set(key, promise);
  void promise.finally(() => {
    if (inFlightDerives.get(key) === promise) {
      inFlightDerives.delete(key);
    }
  });
}

/** Persist a fast-path derivation so the next read hits `getCachedStrategyOverview`. */
export async function persistFastPathStrategyOverview(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  payload: CompetitorStrategyOverviewPayload;
  sourceScrapeBatchId?: string | null;
}): Promise<void> {
  const { supabase, userId, competitorId, payload } = params;
  const batchId =
    params.sourceScrapeBatchId !== undefined
      ? params.sourceScrapeBatchId
      : await getLatestScrapeBatchId(supabase, competitorId);

  const stamped: CompetitorStrategyOverviewPayload = {
    ...payload,
    derivedFastPath: true,
    sourceScrapeBatchId: batchId,
  };

  const adsFingerprint = await computeActiveAdsFingerprint(supabase, userId, competitorId);

  const { error } = await supabase.from("competitor_strategy_overview").upsert(
    {
      user_id: userId,
      competitor_id: competitorId,
      payload: stamped as unknown as Json,
      source_scrape_batch_id: batchId,
      ai_model_version: STRATEGY_OVERVIEW_MODEL_VERSION,
      ads_fingerprint: adsFingerprint,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "competitor_id" }
  );

  if (error) {
    console.error(
      `[fast-path-persist-FAILED] competitorId=${competitorId} userId=${userId} error=${error.message}`
    );
  }
}
