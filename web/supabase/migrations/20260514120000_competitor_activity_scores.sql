-- Cached operational-footprint scores per competitor (Activity Score). Recomputed after scrapes / on demand.

CREATE TABLE IF NOT EXISTS public.competitor_activity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.saved_competitors (id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  tier integer NOT NULL CHECK (tier BETWEEN 1 AND 6),
  tier_label text NOT NULL,
  spend_range_min integer NOT NULL,
  spend_range_max integer,
  signal_production_value integer NOT NULL,
  signal_creative_diversity integer NOT NULL,
  signal_refresh_velocity integer NOT NULL,
  signal_format_sophistication integer NOT NULL,
  signal_landing_infra integer NOT NULL,
  signal_copy_sophistication integer NOT NULL,
  signal_product_depth integer NOT NULL,
  signal_activity_duration integer NOT NULL,
  reasons_top jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ads_count_at_calc integer NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'insufficient')),
  calculated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, competitor_id)
);

CREATE INDEX IF NOT EXISTS competitor_activity_scores_user_competitor_idx
  ON public.competitor_activity_scores (user_id, competitor_id);

COMMENT ON TABLE public.competitor_activity_scores IS 'Operational footprint score (0–100) derived from scraped_ads; not platform-reported spend.';

ALTER TABLE public.competitor_activity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitor_activity_scores_select_own"
  ON public.competitor_activity_scores FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "competitor_activity_scores_insert_own"
  ON public.competitor_activity_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "competitor_activity_scores_update_own"
  ON public.competitor_activity_scores FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "competitor_activity_scores_delete_own"
  ON public.competitor_activity_scores FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
