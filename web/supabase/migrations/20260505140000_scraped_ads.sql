-- Normalized scraped ads for Strategy Overview derivation pipeline (seed via scripts/seed-strategy-overview.ts)

create table if not exists public.scrape_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  label text
);

create index if not exists scrape_batches_competitor_idx on public.scrape_batches (competitor_id);
create index if not exists scrape_batches_user_idx on public.scrape_batches (user_id);

create table if not exists public.scraped_ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  platform text not null,
  ad_text text not null,
  ad_creative_url text,
  format text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  is_active boolean not null default true,
  scrape_batch_id uuid references public.scrape_batches (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  ai_extracted_angle text,
  funnel_stage text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint scraped_ads_platform_check check (
    platform = any (
      array[
        'meta'::text,
        'google'::text,
        'tiktok'::text,
        'linkedin'::text,
        'snapchat'::text,
        'pinterest'::text,
        'reddit'::text,
        'youtube'::text
      ]
    )
  ),
  constraint scraped_ads_funnel_check check (
    funnel_stage is null or funnel_stage = any (array['TOF'::text, 'MOF'::text, 'BOF'::text])
  )
);

create index if not exists scraped_ads_competitor_active_idx on public.scraped_ads (competitor_id, is_active);
create index if not exists scraped_ads_user_competitor_idx on public.scraped_ads (user_id, competitor_id);

comment on table public.scraped_ads is 'Row-level scraped creatives; Strategy Overview reads from here after enrichment.';

alter table public.scrape_batches enable row level security;
alter table public.scraped_ads enable row level security;

drop policy if exists "scrape_batches_select_own" on public.scrape_batches;
create policy "scrape_batches_select_own"
  on public.scrape_batches for select
  using (auth.uid() = user_id);

drop policy if exists "scrape_batches_insert_own" on public.scrape_batches;
create policy "scrape_batches_insert_own"
  on public.scrape_batches for insert
  with check (auth.uid() = user_id);

drop policy if exists "scrape_batches_update_own" on public.scrape_batches;
create policy "scrape_batches_update_own"
  on public.scrape_batches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "scrape_batches_delete_own" on public.scrape_batches;
create policy "scrape_batches_delete_own"
  on public.scrape_batches for delete
  using (auth.uid() = user_id);

drop policy if exists "scraped_ads_select_own" on public.scraped_ads;
create policy "scraped_ads_select_own"
  on public.scraped_ads for select
  using (auth.uid() = user_id);

drop policy if exists "scraped_ads_insert_own" on public.scraped_ads;
create policy "scraped_ads_insert_own"
  on public.scraped_ads for insert
  with check (auth.uid() = user_id);

drop policy if exists "scraped_ads_update_own" on public.scraped_ads;
create policy "scraped_ads_update_own"
  on public.scraped_ads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "scraped_ads_delete_own" on public.scraped_ads;
create policy "scraped_ads_delete_own"
  on public.scraped_ads for delete
  using (auth.uid() = user_id);
