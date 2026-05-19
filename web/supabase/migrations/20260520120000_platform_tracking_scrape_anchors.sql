-- Scrape anchors for Smart Prioritization date windows and scheduling

alter table public.saved_competitors
  add column if not exists first_scrape_completed_at timestamptz;

comment on column public.saved_competitors.first_scrape_completed_at is
  'Set once when initial discovery classify runs; anchor for first scheduled refresh window';

alter table public.competitor_platform_tracking
  add column if not exists last_scrape_at timestamptz;

comment on column public.competitor_platform_tracking.last_scrape_at is
  'Last successful scrape completion for this platform (discovery classify or cron refresh)';
