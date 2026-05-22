import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import {
  getLatestScrapeBatchId,
  loadSavedCompetitorForUser,
} from "@/lib/strategy-overview/recompute-strategy-overview";
import { SCRAPED_ADS_DERIVATION_SELECT, scrapedAdDerivationRowToInput, type ScrapedAdDerivationRow } from "@/lib/strategy-overview/scraped-ads-derivation-columns";
import { deriveStrategyOverviewPayload } from "@/lib/strategy-overview/strategyDerivation";

function rowToInput(r: ScrapedAdDerivationRow) {
  return scrapedAdDerivationRowToInput(r);
}

type SavedCompetitorMeta = NonNullable<Awaited<ReturnType<typeof loadSavedCompetitorForUser>>>;

/** Derive a strategy overview payload from active scraped_ads (no LLM / cache write). */
export async function derivePayloadFromActiveScrapedAds(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  domainHint: string;
  /** Caller may already have resolved meta/rows — avoids duplicate lookups and racey nulls. */
  meta?: SavedCompetitorMeta | null;
  adsRows?: ScrapedAdDerivationRow[];
}): Promise<CompetitorStrategyOverviewPayload | null> {
  const { supabase, userId, competitorId, domainHint } = params;

  const meta = params.meta ?? (await loadSavedCompetitorForUser(supabase, userId, domainHint));
  if (!meta) return null;

  let adsRows = params.adsRows;
  if (!adsRows?.length) {
    const { data, error: adsErr } = await supabase
      .from("scraped_ads")
      .select(SCRAPED_ADS_DERIVATION_SELECT)
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (adsErr || !data?.length) return null;
    adsRows = data as ScrapedAdDerivationRow[];
  }

  const rows = adsRows;

  const inputs = rows.map(rowToInput);
  const batchId = await getLatestScrapeBatchId(supabase, competitorId);
  const footprintRows = rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  }));

  try {
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

    const enrichedDb = rows.filter((r) => r.ai_enrichment_status === "enriched").length;
    const enrichmentRate = rows.length > 0 ? enrichedDb / rows.length : 0;

    return normalizeCompetitorStrategyOverviewPayload({
      ...payload,
      lowEnrichmentConfidence: rows.length > 0 && enrichmentRate < 0.5,
      insufficientEnrichedAds: enrichedDb < 5,
    });
  } catch (e) {
    console.error("[derivePayloadFromActiveScrapedAds] derive failed", {
      competitorId,
      domainHint,
      adCount: rows.length,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}
