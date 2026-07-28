create table if not exists public.discovery_pattern_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  week_start date not null,
  status text not null default 'done',
  error_text text,
  metrics jsonb not null default '{}'::jsonb,
  insights jsonb not null default '{}'::jsonb,
  model text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brand_id, week_start)
);

create index if not exists discovery_pattern_reports_user_brand_idx
  on public.discovery_pattern_reports (user_id, brand_id, week_start desc);

alter table public.discovery_pattern_reports enable row level security;

drop policy if exists "discovery_pattern_reports_own_rows" on public.discovery_pattern_reports;
create policy "discovery_pattern_reports_own_rows"
  on public.discovery_pattern_reports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.discovery_pattern_reports to authenticated;
grant all on table public.discovery_pattern_reports to service_role;
