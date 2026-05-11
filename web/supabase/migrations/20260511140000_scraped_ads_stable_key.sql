-- Deduplicated scraped_ads rows per creative stable key (incremental refreshes / merges).

alter table public.scraped_ads
  add column if not exists stable_ad_key text;

update public.scraped_ads
set stable_ad_key = 'legacy:' || id::text
where stable_ad_key is null;

alter table public.scraped_ads
  alter column stable_ad_key set not null;

alter table public.scraped_ads
  drop constraint if exists scraped_ads_user_competitor_platform_stable_key_key;

alter table public.scraped_ads
  add constraint scraped_ads_user_competitor_platform_stable_key_key
  unique (user_id, competitor_id, platform, stable_ad_key);

comment on column public.scraped_ads.stable_ad_key is 'Per-platform stable creative id for merge/dedupe (see web/src/lib/ad-library/stable-ad-keys.ts).';
