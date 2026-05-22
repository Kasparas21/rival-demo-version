import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { derivePayloadFromActiveScrapedAds } from "@/lib/strategy-overview/derive-payload-from-active-ads";
import {
  awaitInFlightDerive,
  persistFastPathStrategyOverview,
  registerInFlightDerive,
} from "@/lib/strategy-overview/fast-path-strategy-cache";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { getLatestScrapeBatchId } from "@/lib/strategy-overview/recompute-strategy-overview";

type DeriveParams = Parameters<typeof derivePayloadFromActiveScrapedAds>[0];

/**
 * Derive strategy overview from active scraped ads, dedupe concurrent callers, and persist
 * so the next read hits `getCachedStrategyOverview`.
 */
export async function deriveAndPersistFastPathStrategyOverview(
  params: DeriveParams
): Promise<CompetitorStrategyOverviewPayload | null> {
  const { supabase, userId, competitorId } = params;

  const existing = awaitInFlightDerive(userId, competitorId);
  if (existing) return existing;

  const work = (async (): Promise<CompetitorStrategyOverviewPayload | null> => {
    const payload = await derivePayloadFromActiveScrapedAds(params);
    if (!payload) return null;

    const batchId =
      payload.sourceScrapeBatchId ?? (await getLatestScrapeBatchId(supabase, competitorId));

    await persistFastPathStrategyOverview({
      supabase,
      userId,
      competitorId,
      payload,
      sourceScrapeBatchId: batchId,
    });

    return { ...payload, derivedFastPath: true, sourceScrapeBatchId: batchId };
  })();

  registerInFlightDerive(userId, competitorId, work);
  return work;
}
