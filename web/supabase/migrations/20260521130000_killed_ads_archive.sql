-- Archive killed ads older than 90 days (PDF: 90 days active retention)

alter table public.scraped_ads
  add column if not exists archived_at timestamptz;

comment on column public.scraped_ads.archived_at is
  'Set when a killed ad is archived after 90-day retention window.';

create index if not exists scraped_ads_killed_archive_idx
  on public.scraped_ads (user_id, last_seen_at)
  where archived_at is null;
