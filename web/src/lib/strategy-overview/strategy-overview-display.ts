import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildAudienceInferenceInputFromPayload,
  inferAudience,
} from "@/lib/comparison/audience-inference";
import type { Database } from "@/lib/supabase/types";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import {
  getRecomputeLockRow,
  healStaleStrategyRecomputeLockIfNeeded,
} from "@/lib/strategy-overview/recompute-strategy-overview";

/** True when saved_competitors.last_scraped_at is newer than overview computed_at. */
export async function scrapeIsNewerThanOverview(
  supabase: SupabaseClient<Database>,
  competitorId: string
): Promise<boolean> {
  const [{ data: saved }, { data: overview }] = await Promise.all([
    supabase.from("saved_competitors").select("last_scraped_at").eq("id", competitorId).maybeSingle(),
    supabase
      .from("competitor_strategy_overview")
      .select("computed_at")
      .eq("competitor_id", competitorId)
      .maybeSingle(),
  ]);

  const scrapedMs = saved?.last_scraped_at ? Date.parse(saved.last_scraped_at) : NaN;
  if (!Number.isFinite(scrapedMs)) return false;
  if (!overview?.computed_at) return true;
  const computedMs = Date.parse(overview.computed_at);
  if (!Number.isFinite(computedMs)) return true;
  return scrapedMs > computedMs;
}

export async function isStrategyRecomputeRunning(
  supabase: SupabaseClient<Database>,
  competitorId: string
): Promise<boolean> {
  await healStaleStrategyRecomputeLockIfNeeded(supabase, competitorId);
  const row = await getRecomputeLockRow(supabase, competitorId);
  if (row?.status !== "running") return false;
  const until = row.locked_until ? Date.parse(row.locked_until) : NaN;
  if (Number.isFinite(until) && until <= Date.now()) return false;
  const started = row.locked_at ? Date.parse(row.locked_at) : NaN;
  if (Number.isFinite(started) && Date.now() - started > 900_000) return false;
  return true;
}

export function mergeAudienceInference(
  primary: CompetitorStrategyOverviewPayload,
  donor: CompetitorStrategyOverviewPayload | null | undefined
): CompetitorStrategyOverviewPayload {
  if (primary.audience_inference?.segments?.length) return primary;
  if (!donor?.audience_inference?.segments?.length) return primary;
  return { ...primary, audience_inference: donor.audience_inference };
}

/** Run Sonnet audience inference when enrichment is sufficient and cache row lacks segments. */
export async function hydrateAudienceInferenceIfReady(
  payload: CompetitorStrategyOverviewPayload,
  meta: { brandName: string; brandDomain: string }
): Promise<CompetitorStrategyOverviewPayload> {
  if (payload.audience_inference?.segments?.length) return payload;

  const total = payload.totalAdCount ?? payload.map?.activeAdCount ?? 0;
  if (total <= 0 || payload.pipelineStatus === "no_ads_found") return payload;

  const enriched = payload.enrichedAdCount ?? 0;
  const rate =
    typeof payload.enrichmentRate === "number"
      ? payload.enrichmentRate
      : total > 0
        ? enriched / total
        : 0;

  if (enriched < 5 && rate < 0.35) return payload;

  const aud = await inferAudience(
    buildAudienceInferenceInputFromPayload(
      { brandName: meta.brandName, brandDomain: meta.brandDomain },
      payload
    )
  );

  if (!aud?.segments?.length) return payload;
  return { ...payload, audience_inference: aud };
}
