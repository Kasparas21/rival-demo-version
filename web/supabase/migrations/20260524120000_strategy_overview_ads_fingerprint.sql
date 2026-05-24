-- Cache invalidation by active ad set fingerprint (not scrape batch id).

ALTER TABLE public.competitor_strategy_overview
  ADD COLUMN IF NOT EXISTS ads_fingerprint text;

COMMENT ON COLUMN public.competitor_strategy_overview.ads_fingerprint IS
  'active_count:max_last_seen_at:max_created_at for is_active scraped_ads; invalidates cache when ad set changes.';

NOTIFY pgrst, 'reload schema';
