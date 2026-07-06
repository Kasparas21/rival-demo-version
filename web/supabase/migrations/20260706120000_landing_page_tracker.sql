-- Landing page screenshot tracking (Website tab)

create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  label text not null,
  page_type text not null default 'custom',
  is_active boolean not null default true,
  auto_detected_from text,
  added_at timestamptz not null default timezone('utc', now()),
  last_screenshotted_at timestamptz,
  next_screenshot_at timestamptz
);

create unique index landing_pages_dedup
  on public.landing_pages (competitor_id, url);

create index landing_pages_due
  on public.landing_pages (next_screenshot_at asc)
  where is_active = true;

create index landing_pages_user_competitor_idx
  on public.landing_pages (user_id, competitor_id);

alter table public.landing_pages enable row level security;

create policy "Users access their own landing pages"
  on public.landing_pages
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.landing_page_snapshots (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  screenshot_url text not null,
  hero_screenshot_url text,
  page_text jsonb not null default '{}'::jsonb,
  pixel_diff_pct double precision,
  has_meaningful_change boolean not null default false,
  change_analysis jsonb not null default '{}'::jsonb,
  taken_at timestamptz not null default timezone('utc', now())
);

create index snapshots_by_page
  on public.landing_page_snapshots (landing_page_id, taken_at desc);

create index snapshots_with_changes
  on public.landing_page_snapshots (competitor_id, has_meaningful_change, taken_at desc);

create index landing_page_snapshots_user_idx
  on public.landing_page_snapshots (user_id, competitor_id);

alter table public.landing_page_snapshots enable row level security;

create policy "Users access their own landing page snapshots"
  on public.landing_page_snapshots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('landing-page-screenshots', 'landing-page-screenshots', true)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
