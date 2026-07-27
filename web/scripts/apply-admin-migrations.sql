-- Paste this entire file into Supabase SQL Editor and click Run.
-- Dashboard: https://supabase.com/dashboard/project/dbcfxoxanvdbghemlaya/sql/new

-- === Migration 1: custom_quotes + admin tables ===

create table if not exists public.custom_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'expired', 'revoked')),
  price_cents integer not null check (price_cents >= 50),
  currency text not null default 'gbp',
  billing_period text not null default 'monthly'
    check (billing_period in ('monthly', 'annual')),
  trial_days integer not null default 7 check (trial_days >= 0 and trial_days <= 90),
  limits jsonb not null default '{}'::jsonb,
  polar_product_id text,
  checkout_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  internal_notes text,
  sales_notes text,
  created_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_quotes_user_id_idx on public.custom_quotes (user_id);
create index if not exists custom_quotes_status_idx on public.custom_quotes (status);
create index if not exists custom_quotes_checkout_token_idx on public.custom_quotes (checkout_token);
create index if not exists custom_quotes_user_status_idx on public.custom_quotes (user_id, status);

alter table public.custom_quotes enable row level security;

drop policy if exists "custom_quotes_select_own" on public.custom_quotes;
create policy "custom_quotes_select_own"
  on public.custom_quotes for select
  using (auth.uid() = user_id);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users for select
  using (auth.uid() = user_id);

create table if not exists public.admin_user_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  company_url text,
  company_role text,
  onboarding_completed boolean not null default false,
  last_active_date date,
  app_streak_days integer not null default 0,
  billing_status text,
  plan_tier text,
  polar_product_name text,
  custom_quote_status text,
  custom_quote_id uuid,
  mrr_cents integer not null default 0,
  competitor_count integer not null default 0,
  competitor_domains text[] not null default '{}',
  ads_scraped_month integer not null default 0,
  scrape_operations_month integer not null default 0,
  swap_count_month integer not null default 0,
  csv_export_count_month integer not null default 0,
  ad_preview_analyses_month integer not null default 0,
  email_ai_analyses_month integer not null default 0,
  scrape_paused boolean not null default false,
  account_suspended boolean not null default false,
  days_inactive integer not null default 0,
  funnel_stage text,
  profile_created_at timestamptz,
  snapshot_at timestamptz not null default now()
);

create index if not exists admin_user_snapshots_email_idx on public.admin_user_snapshots (email);
create index if not exists admin_user_snapshots_last_active_idx on public.admin_user_snapshots (last_active_date desc nulls last);
create index if not exists admin_user_snapshots_funnel_idx on public.admin_user_snapshots (funnel_stage);
create index if not exists admin_user_snapshots_scrape_paused_idx on public.admin_user_snapshots (scrape_paused) where scrape_paused = true;
create index if not exists admin_user_snapshots_account_suspended_idx
  on public.admin_user_snapshots (account_suspended)
  where account_suspended = true;

alter table public.admin_user_snapshots enable row level security;
revoke all on public.admin_user_snapshots from anon, authenticated;

create table if not exists public.admin_event_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_event_log_target_idx on public.admin_event_log (target_user_id, created_at desc);

alter table public.admin_event_log enable row level security;
revoke all on public.admin_event_log from anon, authenticated;

-- === Migration 2: seed admin users ===

insert into public.admin_users (user_id, email, role)
select u.id, lower(trim(u.email)), 'admin'
from auth.users u
where lower(trim(u.email)) in (
  lower(trim('attributo@yahoo.com')),
  lower(trim('freecardsbf2@gmail.com'))
)
on conflict (user_id) do update set
  email = excluded.email,
  role = 'admin';

-- === Migration 3: allow £0 / complimentary quotes ===

alter table public.custom_quotes
  drop constraint if exists custom_quotes_price_cents_check;

alter table public.custom_quotes
  add constraint custom_quotes_price_cents_check check (price_cents >= 0);
