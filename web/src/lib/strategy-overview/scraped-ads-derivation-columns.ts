/** Columns required for strategy derivation + spend footprint (avoids select("*")). */
export const SCRAPED_ADS_DERIVATION_SELECT =
  "id, platform, ad_text, format, first_seen_at, last_seen_at, ai_extracted_angle, funnel_stage, ai_enrichment_status, ai_extracted_launch_date, ai_extracted_voice_tone, is_active, raw_payload, created_at" as const;

/** Subset of scraped_ads rows returned by {@link SCRAPED_ADS_DERIVATION_SELECT}. */
export type ScrapedAdDerivationRow = {
  id: string;
  platform: string;
  ad_text: string;
  format: string;
  first_seen_at: string;
  last_seen_at: string;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  ai_enrichment_status: string | null;
  ai_extracted_launch_date: string | null;
  ai_extracted_voice_tone: unknown;
  is_active: boolean;
  raw_payload: unknown;
  created_at: string;
};

export function scrapedAdDerivationRowToInput(r: ScrapedAdDerivationRow): import("@/lib/strategy-overview/strategyDerivation").ScrapedAdInput {
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
