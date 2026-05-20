import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import {
  getLatestScrapeBatchId,
  loadSavedCompetitorForUser,
} from "@/lib/strategy-overview/recompute-strategy-overview";
import { deriveStrategyOverviewPayload, type ScrapedAdInput } from "@/lib/strategy-overview/strategyDerivation";

function rowToInput(r: Database["public"]["Tables"]["scraped_ads"]["Row"]): ScrapedAdInput {
  return {
    id: r.id,
    platform: r.platform,
    ad_text: r.ad_text,
    format: r.format,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    ai_extracted_angle: r.ai_extracted_angle,
    funnel_stage: r.funnel_stage,
    ai_enrichment_status: r.ai_enrichment_status ?? null,
    ai_extracted_launch_date: r.ai_extracted_launch_date ?? null,
    ai_extracted_voice_tone: r.ai_extracted_voice_tone ?? null,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  };
}

/** Derive a strategy overview payload from active scraped_ads (no LLM / cache write). */
export async function derivePayloadFromActiveScrapedAds(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  domainHint: string;
}): Promise<CompetitorStrategyOverviewPayload | null> {
  const { supabase, userId, competitorId, domainHint } = params;

  const meta = await loadSavedCompetitorForUser(supabase, userId, domainHint);
  if (!meta) return null;

  const { data: adsRows, error: adsErr } = await supabase
    .from("scraped_ads")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (adsErr || !adsRows?.length) return null;

  const inputs = adsRows.map(rowToInput);
  const batchId = await getLatestScrapeBatchId(supabase, competitorId);
  const footprintRows = adsRows.map((r) => ({
    id: r.id,
    platform: r.platform,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  }));

  const payload = deriveStrategyOverviewPayload(
    inputs,
    {
      name: meta.name,
      domain: meta.brandDomain ?? meta.cacheDomain,
      logoUrl: meta.logoUrl,
    },
    batchId,
    {
      spendV2: {
        footprintRows,
        competitorId: meta.competitorId,
        userId,
        brandDomain: meta.brandDomain,
        lastScrapedAt: meta.lastScrapedAt,
      },
    }
  );

  const enrichedDb = adsRows.filter((r) => r.ai_enrichment_status === "enriched").length;
  const enrichmentRate = adsRows.length > 0 ? enrichedDb / adsRows.length : 0;

  return normalizeCompetitorStrategyOverviewPayload({
    ...payload,
    lowEnrichmentConfidence: adsRows.length > 0 && enrichmentRate < 0.5,
    insufficientEnrichedAds: enrichedDb < 5,
  });
}
