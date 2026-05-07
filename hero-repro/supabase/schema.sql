create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists company_name text,
  add column if not exists company_url text,
  add column if not exists company_role text,
  add column if not exists onboarding_completed boolean not null default false;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  domain text,
  logo_url text,
  color text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.brands add column if not exists brand_context text;

alter table public.brands enable row level security;

drop policy if exists "Users manage own brands" on public.brands;
create policy "Users manage own brands"
  on public.brands for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists brands_user_id on public.brands (user_id);

create table if not exists public.saved_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  logo_url text,
  brand_name text,
  brand_domain text,
  brand_logo_url text,
  pending boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_scraped_at timestamptz,
  constraint saved_competitors_user_id_slug_key unique (user_id, slug)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  terms jsonb not null default '[]'::jsonb,
  channels text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.strategy_overview_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_domain text not null,
  competitor_name text not null,
  cards jsonb not null,
  snapshot text not null default '',
  ads_hash text not null,
  generated_at timestamptz not null default timezone('utc', now()),
  constraint strategy_overview_cache_user_id_competitor_domain_key unique (user_id, competitor_domain)
);

-- Idempotent: existing DBs created before this column
alter table public.saved_competitors
  add column if not exists last_scraped_at timestamptz;

-- Per-platform scraped ads (server cache; 24h TTL in application)
create table if not exists public.ads_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_domain text not null,
  platform text not null,
  ads_data jsonb not null,
  scraped_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  constraint ads_cache_user_domain_platform unique (user_id, competitor_domain, platform)
);

create index if not exists ads_cache_lookup
  on public.ads_cache (user_id, competitor_domain, platform);

alter table public.ads_cache enable row level security;

drop policy if exists "Users read own ads cache" on public.ads_cache;
drop policy if exists "Users insert own ads cache" on public.ads_cache;
drop policy if exists "Users update own ads cache" on public.ads_cache;
drop policy if exists "Users delete own ads cache" on public.ads_cache;

create policy "Users read own ads cache"
  on public.ads_cache for select using (auth.uid() = user_id);
create policy "Users insert own ads cache"
  on public.ads_cache for insert with check (auth.uid() = user_id);
create policy "Users update own ads cache"
  on public.ads_cache for update using (auth.uid() = user_id);
create policy "Users delete own ads cache"
  on public.ads_cache for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists saved_competitors_set_updated_at on public.saved_competitors;
create trigger saved_competitors_set_updated_at
before update on public.saved_competitors
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.saved_competitors enable row level security;
alter table public.saved_searches enable row level security;
alter table public.strategy_overview_cache enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users manage their own competitors" on public.saved_competitors;
create policy "Users manage their own competitors"
on public.saved_competitors
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their own searches" on public.saved_searches;
create policy "Users manage their own searches"
on public.saved_searches
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own strategy overview cache" on public.strategy_overview_cache;
create policy "Users can read own strategy overview cache"
on public.strategy_overview_cache
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own strategy overview cache" on public.strategy_overview_cache;
create policy "Users can insert own strategy overview cache"
on public.strategy_overview_cache
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own strategy overview cache" on public.strategy_overview_cache;
create policy "Users can update own strategy overview cache"
on public.strategy_overview_cache
for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own strategy overview cache" on public.strategy_overview_cache;
create policy "Users can delete own strategy overview cache"
on public.strategy_overview_cache
for delete
using (auth.uid() = user_id);
