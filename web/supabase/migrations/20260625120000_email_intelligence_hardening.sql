-- Email intelligence hardening: analysis failure tracking, AI usage quota, query index

alter table public.competitor_emails
  add column if not exists ai_analysis_error text,
  add column if not exists ai_analysis_attempts integer not null default 0;

comment on column public.competitor_emails.ai_analysis_error is
  'Last AI analysis failure message; null when pending or successful.';
comment on column public.competitor_emails.ai_analysis_attempts is
  'Number of AI analysis attempts; stops auto-retry after app threshold.';

create table if not exists public.email_intelligence_analysis_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  analysis_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

comment on table public.email_intelligence_analysis_usage is
  'Competitor email AI analyses per UTC month (successful runs only).';

alter table public.email_intelligence_analysis_usage enable row level security;

drop policy if exists "email_intelligence_analysis_usage_select_own" on public.email_intelligence_analysis_usage;
create policy "email_intelligence_analysis_usage_select_own"
  on public.email_intelligence_analysis_usage for select
  using (auth.uid() = user_id);

drop policy if exists "email_intelligence_analysis_usage_modify_own" on public.email_intelligence_analysis_usage;
create policy "email_intelligence_analysis_usage_modify_own"
  on public.email_intelligence_analysis_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.increment_email_intelligence_analysis_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ym text := to_char((now() at time zone 'utc'), 'YYYY-MM');
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.email_intelligence_analysis_usage (user_id, year_month, analysis_count, updated_at)
  values (p_user_id, ym, 1, now())
  on conflict (user_id, year_month) do update set
    analysis_count = public.email_intelligence_analysis_usage.analysis_count + 1,
    updated_at = now();
end;
$$;

grant execute on function public.increment_email_intelligence_analysis_usage(uuid) to authenticated;
grant execute on function public.increment_email_intelligence_analysis_usage(uuid) to service_role;

create index if not exists competitor_emails_user_competitor_received_idx
  on public.competitor_emails (user_id, competitor_id, received_at desc);
