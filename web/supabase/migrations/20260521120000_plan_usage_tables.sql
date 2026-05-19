-- Plan quota usage tracking (Starter / Pro PDF spec)

create table if not exists public.competitor_swap_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  swap_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

comment on table public.competitor_swap_usage is 'Competitor remove/replace operations per UTC month.';

alter table public.competitor_swap_usage enable row level security;

create policy "competitor_swap_usage_select_own"
  on public.competitor_swap_usage for select
  using (auth.uid() = user_id);

create policy "competitor_swap_usage_modify_own"
  on public.competitor_swap_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.csv_export_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  export_count integer not null default 0,
  ads_exported integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

comment on table public.csv_export_usage is 'CSV export quota per UTC month (Pro plan).';

alter table public.csv_export_usage enable row level security;

create policy "csv_export_usage_select_own"
  on public.csv_export_usage for select
  using (auth.uid() = user_id);

create policy "csv_export_usage_modify_own"
  on public.csv_export_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.manual_refresh_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  refresh_count integer not null default 0,
  last_refresh_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month, competitor_id)
);

comment on table public.manual_refresh_usage is 'Pro manual force-rescrape quota per competitor per UTC month.';

alter table public.manual_refresh_usage enable row level security;

create policy "manual_refresh_usage_select_own"
  on public.manual_refresh_usage for select
  using (auth.uid() = user_id);

create policy "manual_refresh_usage_modify_own"
  on public.manual_refresh_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.saved_competitors
  add column if not exists smart_prioritization_disabled boolean not null default false;

comment on column public.saved_competitors.smart_prioritization_disabled is
  'Pro only: when true, skip Smart Prioritization scheduling for this competitor.';

create or replace function public.increment_competitor_swap_usage()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ym text := to_char((now() at time zone 'utc'), 'YYYY-MM');
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.competitor_swap_usage (user_id, year_month, swap_count, updated_at)
  values (auth.uid(), ym, 1, now())
  on conflict (user_id, year_month) do update set
    swap_count = public.competitor_swap_usage.swap_count + 1,
    updated_at = now();
end;
$$;

grant execute on function public.increment_competitor_swap_usage() to authenticated;
grant execute on function public.increment_competitor_swap_usage() to service_role;

create or replace function public.increment_csv_export_usage(p_ads_count integer)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ym text := to_char((now() at time zone 'utc'), 'YYYY-MM');
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.csv_export_usage (user_id, year_month, export_count, ads_exported, updated_at)
  values (auth.uid(), ym, 1, greatest(0, coalesce(p_ads_count, 0)), now())
  on conflict (user_id, year_month) do update set
    export_count = public.csv_export_usage.export_count + 1,
    ads_exported = public.csv_export_usage.ads_exported + greatest(0, coalesce(p_ads_count, 0)),
    updated_at = now();
end;
$$;

grant execute on function public.increment_csv_export_usage(integer) to authenticated;
grant execute on function public.increment_csv_export_usage(integer) to service_role;

create or replace function public.record_manual_refresh_usage(p_competitor_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ym text := to_char((now() at time zone 'utc'), 'YYYY-MM');
begin
  if auth.uid() is null or p_competitor_id is null then
    return;
  end if;
  insert into public.manual_refresh_usage (user_id, year_month, competitor_id, refresh_count, last_refresh_at, updated_at)
  values (auth.uid(), ym, p_competitor_id, 1, now(), now())
  on conflict (user_id, year_month, competitor_id) do update set
    refresh_count = public.manual_refresh_usage.refresh_count + 1,
    last_refresh_at = now(),
    updated_at = now();
end;
$$;

grant execute on function public.record_manual_refresh_usage(uuid) to authenticated;
grant execute on function public.record_manual_refresh_usage(uuid) to service_role;
