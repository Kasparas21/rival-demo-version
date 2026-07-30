-- Per-competitor: automatically start spying new ad landing page URLs when they appear.

alter table public.saved_competitors
  add column if not exists auto_spy_new_landing_pages boolean not null default false;

comment on column public.saved_competitors.auto_spy_new_landing_pages is
  'When true, new landing page URLs detected in scraped ads are auto-activated for screenshot tracking.';

notify pgrst, 'reload schema';
