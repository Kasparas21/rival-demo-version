-- Ad preview AI analysis cache + monthly quota (Starter 10 / Pro 20 per UTC month).

create table if not exists public.ad_preview_analysis_cache (
  ad_id uuid primary key references public.scraped_ads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis jsonb not null,
  computed_at timestamptz not null default timezone('utc', now()),
  ai_model_version text not null
);

create index if not exists idx_ad_preview_analysis_user on public.ad_preview_analysis_cache (user_id, computed_at desc);

comment on table public.ad_preview_analysis_cache is
  'Full ad preview AI analysis per ad; persisted for the user workspace.';

alter table public.ad_preview_analysis_cache enable row level security;

drop policy if exists "ad_preview_analysis_cache_select_own" on public.ad_preview_analysis_cache;
create policy "ad_preview_analysis_cache_select_own"
  on public.ad_preview_analysis_cache for select
  using (auth.uid() = user_id);

drop policy if exists "ad_preview_analysis_cache_insert_own" on public.ad_preview_analysis_cache;
create policy "ad_preview_analysis_cache_insert_own"
  on public.ad_preview_analysis_cache for insert
  with check (auth.uid() = user_id);

drop policy if exists "ad_preview_analysis_cache_update_own" on public.ad_preview_analysis_cache;
create policy "ad_preview_analysis_cache_update_own"
  on public.ad_preview_analysis_cache for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ad_preview_analysis_cache_delete_own" on public.ad_preview_analysis_cache;
create policy "ad_preview_analysis_cache_delete_own"
  on public.ad_preview_analysis_cache for delete
  using (auth.uid() = user_id);

create table if not exists public.ad_preview_analysis_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  analysis_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

comment on table public.ad_preview_analysis_usage is
  'New ad preview AI analyses per UTC month (cached re-reads do not increment).';

alter table public.ad_preview_analysis_usage enable row level security;

drop policy if exists "ad_preview_analysis_usage_select_own" on public.ad_preview_analysis_usage;
create policy "ad_preview_analysis_usage_select_own"
  on public.ad_preview_analysis_usage for select
  using (auth.uid() = user_id);

drop policy if exists "ad_preview_analysis_usage_modify_own" on public.ad_preview_analysis_usage;
create policy "ad_preview_analysis_usage_modify_own"
  on public.ad_preview_analysis_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.increment_ad_preview_analysis_usage()
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
  insert into public.ad_preview_analysis_usage (user_id, year_month, analysis_count, updated_at)
  values (auth.uid(), ym, 1, now())
  on conflict (user_id, year_month) do update set
    analysis_count = public.ad_preview_analysis_usage.analysis_count + 1,
    updated_at = now();
end;
$$;

grant execute on function public.increment_ad_preview_analysis_usage() to authenticated;
grant execute on function public.increment_ad_preview_analysis_usage() to service_role;
