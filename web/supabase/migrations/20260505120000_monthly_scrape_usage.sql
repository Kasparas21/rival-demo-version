-- Monthly aggregates for ad scraping (Apify runs), per user, calendar month in UTC.
create table if not exists public.monthly_scrape_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  ads_scraped integer not null default 0,
  scrape_operations integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

comment on table public.monthly_scrape_usage is 'Running totals of ads pulled via Apify per user per UTC month.';

alter table public.monthly_scrape_usage enable row level security;

create policy "monthly_scrape_usage_select_own"
  on public.monthly_scrape_usage for select
  using (auth.uid() = user_id);

create policy "monthly_scrape_usage_modify_own"
  on public.monthly_scrape_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.increment_monthly_scrape_usage(p_ads_count integer, p_ops_count integer)
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
  if coalesce(p_ads_count, 0) <= 0 and coalesce(p_ops_count, 0) <= 0 then
    return;
  end if;
  insert into public.monthly_scrape_usage (user_id, year_month, ads_scraped, scrape_operations, updated_at)
  values (auth.uid(), ym, greatest(0, coalesce(p_ads_count, 0)), greatest(0, coalesce(p_ops_count, 0)), now())
  on conflict (user_id, year_month) do update set
    ads_scraped = public.monthly_scrape_usage.ads_scraped + excluded.ads_scraped,
    scrape_operations = public.monthly_scrape_usage.scrape_operations + excluded.scrape_operations,
    updated_at = now();
end;
$$;

grant execute on function public.increment_monthly_scrape_usage(integer, integer) to authenticated;
grant execute on function public.increment_monthly_scrape_usage(integer, integer) to service_role;
