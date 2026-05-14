-- Speed up comparison payload + ad-detail hot paths (batch lookups, winner lookup, latest scrape batch).

CREATE INDEX IF NOT EXISTS competitor_strategy_overview_user_competitor_idx ON public.competitor_strategy_overview (
  user_id,
  competitor_id
);

CREATE INDEX IF NOT EXISTS scraped_ads_user_competitor_active_idx ON public.scraped_ads (user_id, competitor_id, is_active)
WHERE
  is_active = true;

CREATE INDEX IF NOT EXISTS scrape_batches_competitor_created_desc_idx ON public.scrape_batches (competitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS creative_tests_user_winner_ad_idx ON public.creative_tests (user_id, winner_ad_id)
WHERE
  winner_ad_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS saved_competitors_user_brand_domain_idx ON public.saved_competitors (user_id, brand_domain);

CREATE INDEX IF NOT EXISTS saved_competitors_user_slug_idx ON public.saved_competitors (user_id, slug);

CREATE INDEX IF NOT EXISTS scraped_ads_library_card_lookup_idx ON public.scraped_ads (user_id, competitor_id, platform, (raw_payload ->> 'id'));
