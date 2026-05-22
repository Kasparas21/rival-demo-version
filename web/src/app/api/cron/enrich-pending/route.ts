import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enrichScrapedAdsIfNeeded } from "@/lib/strategy-overview/adEnrichment";
import {
  SCRAPED_ADS_DERIVATION_SELECT,
  scrapedAdDerivationRowToInput,
  type ScrapedAdDerivationRow,
} from "@/lib/strategy-overview/scraped-ads-derivation-columns";

export const runtime = "nodejs";
export const maxDuration = 300;

const CRON_ENRICHMENT_MAX_ADS = 90;
const CRON_ENRICHMENT_MAX_BATCHES = 6;

/** POST — enrich pending scraped ads in bounded batches. Bearer CRON_SECRET. */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: seed, error: seedErr } = await admin
    .from("scraped_ads")
    .select("user_id, competitor_id")
    .eq("is_active", true)
    .or("ai_enrichment_status.is.null,ai_enrichment_status.eq.pending,ai_enrichment_status.eq.failed")
    .limit(1)
    .maybeSingle();

  if (seedErr) {
    return Response.json({ ok: false, error: seedErr.message }, { status: 500 });
  }

  if (!seed) {
    return Response.json({ ok: true, processed: 0, message: "no pending enrichment" });
  }

  const { user_id: userId, competitor_id: competitorId } = seed;

  const { data: adsRows, error: adsErr } = await admin
    .from("scraped_ads")
    .select(SCRAPED_ADS_DERIVATION_SELECT)
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .or("ai_enrichment_status.is.null,ai_enrichment_status.eq.pending,ai_enrichment_status.eq.failed")
    .order("created_at", { ascending: true })
    .limit(CRON_ENRICHMENT_MAX_ADS);

  if (adsErr) {
    return Response.json({ ok: false, error: adsErr.message }, { status: 500 });
  }

  const inputs = ((adsRows ?? []) as ScrapedAdDerivationRow[]).map(scrapedAdDerivationRowToInput);
  if (inputs.length === 0) {
    return Response.json({ ok: true, processed: 0, competitorId });
  }

  const stats = await enrichScrapedAdsIfNeeded(admin, userId, competitorId, inputs, {
    maxAdsToProcess: CRON_ENRICHMENT_MAX_ADS,
    maxBatches: CRON_ENRICHMENT_MAX_BATCHES,
  });

  return Response.json({
    ok: true,
    competitorId,
    userId,
    candidateAds: inputs.length,
    ...stats,
  });
}
