-- Persisted Sonnet brand comparison — invalidates when last_scraped_at stamps change.

CREATE TABLE IF NOT EXISTS public.brand_comparison_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  your_brand_id uuid NOT NULL REFERENCES public.saved_competitors (id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.saved_competitors (id) ON DELETE CASCADE,
  your_brand_scraped_at timestamptz NOT NULL,
  competitor_scraped_at timestamptz NOT NULL,
  result_payload jsonb NOT NULL,
  ai_model_version text NOT NULL DEFAULT 'claude-sonnet-4-6',
  ai_cost_usd numeric(10, 4) NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT timezone ('utc', now()),
  CONSTRAINT brand_comparison_results_cache_key UNIQUE (
    user_id,
    your_brand_id,
    competitor_id,
    your_brand_scraped_at,
    competitor_scraped_at
  )
);

CREATE INDEX IF NOT EXISTS brand_comparison_results_lookup_idx ON public.brand_comparison_results (
  user_id,
  your_brand_id,
  competitor_id
);

ALTER TABLE public.brand_comparison_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_comparison_results_select_own" ON public.brand_comparison_results;

CREATE POLICY "brand_comparison_results_select_own" ON public.brand_comparison_results FOR SELECT USING (auth.uid () = user_id);

DROP POLICY IF EXISTS "brand_comparison_results_insert_own" ON public.brand_comparison_results;

CREATE POLICY "brand_comparison_results_insert_own" ON public.brand_comparison_results FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

DROP POLICY IF EXISTS "brand_comparison_results_update_own" ON public.brand_comparison_results;

CREATE POLICY "brand_comparison_results_update_own" ON public.brand_comparison_results FOR UPDATE USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

DROP POLICY IF EXISTS "brand_comparison_results_delete_own" ON public.brand_comparison_results;

CREATE POLICY "brand_comparison_results_delete_own" ON public.brand_comparison_results FOR DELETE USING (auth.uid () = user_id);

COMMENT ON TABLE public.brand_comparison_results IS 'Cached Claude Sonnet brand vs competitor narrative; keyed by both brands’ last_scraped_at.';

NOTIFY pgrst, 'reload schema';
