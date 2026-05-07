-- Align platform constraint with product: Microsoft ads + YouTube (Google actor) are valid; Reddit was removed.
alter table public.scraped_ads drop constraint if exists scraped_ads_platform_check;

alter table public.scraped_ads add constraint scraped_ads_platform_check check (
  platform = any (
    array[
      'meta'::text,
      'google'::text,
      'tiktok'::text,
      'linkedin'::text,
      'snapchat'::text,
      'pinterest'::text,
      'youtube'::text,
      'microsoft'::text
    ]
  )
);
