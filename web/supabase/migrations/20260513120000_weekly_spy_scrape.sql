-- Weekly automated spy scraping for followed competitors

alter table public.saved_competitors
  add column if not exists is_followed boolean not null default false;

alter table public.saved_competitors
  add column if not exists followed_at timestamptz;

create table public.weekly_scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  week_start date not null,
  status text not null default 'pending',
  scrape_batch_id uuid references public.scrape_batches (id) on delete set null,
  error_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index weekly_scrape_jobs_competitor_idx on public.weekly_scrape_jobs (competitor_id);
create index weekly_scrape_jobs_user_status_idx on public.weekly_scrape_jobs (user_id, status);

comment on table public.weekly_scrape_jobs is 'Weekly cron scrape jobs per user/competitor; status pending|running|done|failed';

alter table public.weekly_scrape_jobs enable row level security;

drop policy if exists "weekly_scrape_jobs_own_row" on public.weekly_scrape_jobs;
create policy "weekly_scrape_jobs_own_row"
  on public.weekly_scrape_jobs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.weekly_scrape_jobs to authenticated;
grant all on table public.weekly_scrape_jobs to service_role;
