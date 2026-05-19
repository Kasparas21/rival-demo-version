-- Per-competitor platform classification for Smart Prioritization

alter table public.saved_competitors
  add column if not exists platform_high_coverage_applied boolean not null default false;

create table public.competitor_platform_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  platform text not null,
  classification text not null,
  active_ad_count integer not null default 0,
  high_coverage_demoted boolean not null default false,
  classified_at timestamptz not null default timezone('utc', now()),
  last_classification_review_at timestamptz not null default timezone('utc', now()),
  next_scrape_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint competitor_platform_tracking_platform_check check (
    platform in ('meta', 'google', 'linkedin', 'tiktok', 'pinterest', 'snapchat', 'youtube', 'microsoft')
  ),
  constraint competitor_platform_tracking_classification_check check (
    classification in ('PRIMARY', 'SECONDARY', 'MINIMAL', 'INACTIVE')
  ),
  constraint competitor_platform_tracking_competitor_platform_key unique (competitor_id, platform)
);

create index competitor_platform_tracking_competitor_idx
  on public.competitor_platform_tracking (competitor_id);

create index competitor_platform_tracking_next_scrape_idx
  on public.competitor_platform_tracking (competitor_id, next_scrape_at);

comment on table public.competitor_platform_tracking is
  'Smart Prioritization: per-platform classification, active ad counts, and refresh schedule';

alter table public.competitor_platform_tracking enable row level security;

drop policy if exists "competitor_platform_tracking_own_row" on public.competitor_platform_tracking;
create policy "competitor_platform_tracking_own_row"
  on public.competitor_platform_tracking
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.competitor_platform_tracking to authenticated;
grant all on table public.competitor_platform_tracking to service_role;
