-- Text transcribed from an ad's creative image. Google's ad library gives most ads no copy at all (only
-- "Advertiser — domain · Image · Shown …"), but every Google row links a rendered image of the ad holding
-- its headline, description and offer. A vision model transcribes it once per ad.
-- Kept apart from ad_text and raw_payload because every scrape rewrites those.

alter table public.scraped_ads
  add column if not exists creative_text text,
  add column if not exists creative_text_at timestamptz;

comment on column public.scraped_ads.creative_text is
  'Ad copy transcribed from the creative image (Google ads without published copy); not touched by scrapes.';
