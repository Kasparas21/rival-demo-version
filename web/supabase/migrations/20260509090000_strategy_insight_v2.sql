-- Strategy Insight V2: launch date + voice tone on scraped_ads; insight card type enum refresh.

ALTER TABLE public.scraped_ads
  ADD COLUMN IF NOT EXISTS ai_extracted_voice_tone JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_extracted_launch_date TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.scraped_ads.ai_extracted_voice_tone IS
  'JSON: { formal, emotional, confidence } ∈ [0,1] from enrichment LLM.';

COMMENT ON COLUMN public.scraped_ads.ai_extracted_launch_date IS
  'Platform-reported ad launch/start when available; else null (timeline falls back to first_seen_at).';

CREATE INDEX IF NOT EXISTS idx_scraped_ads_launch_date
  ON public.scraped_ads (competitor_id, ai_extracted_launch_date)
  WHERE ai_extracted_launch_date IS NOT NULL;

ALTER TABLE public.strategy_insights_cards DROP CONSTRAINT IF EXISTS strategy_insights_cards_type_check;

-- Rows may still use V1 card_type values (e.g. funnel_architecture); they must be removed before the new CHECK.
-- Next strategy recompute repopulates strategy_insights_cards with V2 types and payload shape.
DELETE FROM public.strategy_insights_cards;

ALTER TABLE public.strategy_insights_cards ADD CONSTRAINT strategy_insights_cards_type_check CHECK (
  card_type = ANY (
    ARRAY[
      'funnel_distribution'::text,
      'budget_allocation'::text,
      'library_activity_timeline'::text,
      'ad_format_mix'::text,
      'angle_clustering'::text,
      'voice_tone_position'::text,
      'platform_footprint'::text
    ]
  )
);
