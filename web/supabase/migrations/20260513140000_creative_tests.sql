CREATE TABLE IF NOT EXISTS public.creative_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES public.saved_competitors (id) ON DELETE CASCADE,
  launch_date DATE NOT NULL,
  platform TEXT NOT NULL,
  ad_ids UUID[] NOT NULL,
  winner_ad_id UUID NULL,
  test_status TEXT NOT NULL CHECK (test_status IN ('running', 'winner_identified', 'all_killed_fast', 'no_clear_winner')),
  median_lifespan_days INTEGER NOT NULL DEFAULT 0,
  max_lifespan_days INTEGER NOT NULL DEFAULT 0,
  winner_lifespan_days INTEGER NULL,
  ad_count INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (competitor_id, launch_date, platform)
);

CREATE INDEX IF NOT EXISTS creative_tests_competitor_idx ON public.creative_tests (competitor_id, launch_date DESC);
CREATE INDEX IF NOT EXISTS creative_tests_user_idx ON public.creative_tests (user_id);
CREATE INDEX IF NOT EXISTS creative_tests_status_idx ON public.creative_tests (competitor_id, test_status);

COMMENT ON TABLE public.creative_tests IS 'Same-day same-platform ad groups with winner detection (Creative Tests tab).';

ALTER TABLE public.creative_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_tests_select_own" ON public.creative_tests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "creative_tests_insert_own" ON public.creative_tests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creative_tests_update_own" ON public.creative_tests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "creative_tests_delete_own" ON public.creative_tests
  FOR DELETE USING (auth.uid() = user_id);
