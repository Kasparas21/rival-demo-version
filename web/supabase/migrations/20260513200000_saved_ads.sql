-- Saved Ads — persistent snapshots of competitor ads (survives source row removal)

create table if not exists public.saved_ads (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  source_scraped_ad_id uuid references public.scraped_ads (id) on delete set null,
  platform text not null,
  ad_text text not null default '',
  ad_creative_url text,
  format text not null default '',
  ai_extracted_angle text,
  funnel_stage text,
  raw_payload jsonb not null default '{}'::jsonb,
  source_first_seen_at timestamptz,
  source_last_seen_at timestamptz,
  notes text,
  saved_by_user_id uuid not null references auth.users (id) on delete cascade,
  saved_at timestamptz not null default timezone ('utc', now()),
  created_at timestamptz not null default timezone ('utc', now()),
  updated_at timestamptz not null default timezone ('utc', now())
);

create index if not exists saved_ads_user_competitor_idx on public.saved_ads (user_id, competitor_id);

create index if not exists saved_ads_competitor_saved_at_idx on public.saved_ads (competitor_id, saved_at desc);

create index if not exists saved_ads_source_ad_idx on public.saved_ads (source_scraped_ad_id);

create unique index if not exists saved_ads_unique_per_source on public.saved_ads (
  user_id,
  competitor_id,
  source_scraped_ad_id
)
where
  source_scraped_ad_id is not null;

alter table public.saved_ads enable row level security;

drop policy if exists "saved_ads_select_own" on public.saved_ads;

create policy "saved_ads_select_own" on public.saved_ads for select using (auth.uid () = user_id);

drop policy if exists "saved_ads_insert_own" on public.saved_ads;

create policy "saved_ads_insert_own" on public.saved_ads for insert
with
  check (auth.uid () = user_id);

drop policy if exists "saved_ads_update_own" on public.saved_ads;

create policy "saved_ads_update_own" on public.saved_ads for update using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

drop policy if exists "saved_ads_delete_own" on public.saved_ads;

create policy "saved_ads_delete_own" on public.saved_ads for delete using (auth.uid () = user_id);

create or replace function public.saved_ads_set_updated_at () returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists saved_ads_updated_at on public.saved_ads;

create trigger saved_ads_updated_at before update on public.saved_ads for each row
execute function public.saved_ads_set_updated_at ();

comment on table public.saved_ads is 'User-saved ad snapshots per competitor; survives scraped_ads deletion.';
