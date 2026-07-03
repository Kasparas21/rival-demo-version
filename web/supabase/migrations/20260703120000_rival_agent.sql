-- Rival Agent: autonomous competitive intelligence signals + delivery

alter table public.saved_competitors
  add column if not exists baseline_metrics jsonb not null default '{}'::jsonb,
  add column if not exists agent_scrape_cycles jsonb not null default '{"ads":0,"email":0,"organic":0}'::jsonb;

comment on column public.saved_competitors.baseline_metrics is 'Rolling 30-day baselines for agent signal detection';
comment on column public.saved_competitors.agent_scrape_cycles is 'Per-source scrape cycle count for agent cold-start gating';

create table if not exists public.agent_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid references public.saved_competitors (id) on delete cascade,
  signal_type text not null,
  source text not null,
  threat_score int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  screenshot_urls text[] not null default '{}',
  delivered boolean not null default false,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint agent_signals_threat_score_check check (threat_score >= 1 and threat_score <= 10)
);

create index if not exists agent_signals_user_created_idx
  on public.agent_signals (user_id, created_at desc);

create index if not exists agent_signals_undelivered_idx
  on public.agent_signals (user_id, delivered, threat_score desc);

create index if not exists agent_signals_competitor_idx
  on public.agent_signals (competitor_id, created_at desc)
  where competitor_id is not null;

alter table public.agent_signals enable row level security;

create policy "agent_signals_select_own"
  on public.agent_signals for select
  using (auth.uid() = user_id);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid references public.saved_competitors (id) on delete set null,
  signal_ids uuid[] not null default '{}',
  channels_delivered text[] not null default '{}',
  subject text,
  body_markdown text,
  body_html text,
  sent_at timestamptz not null default timezone('utc', now()),
  status text not null default 'sent',
  constraint agent_messages_status_check check (status in ('sent', 'failed'))
);

create index if not exists agent_messages_user_sent_idx
  on public.agent_messages (user_id, sent_at desc);

create index if not exists agent_messages_user_competitor_sent_idx
  on public.agent_messages (user_id, competitor_id, sent_at desc);

alter table public.agent_messages enable row level security;

create policy "agent_messages_select_own"
  on public.agent_messages for select
  using (auth.uid() = user_id);

create table if not exists public.agent_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade unique,
  enabled boolean not null default true,
  channels jsonb not null default '{}'::jsonb,
  min_threat_score int not null default 6,
  weekly_brief_enabled boolean not null default false,
  weekly_brief_day text not null default 'monday',
  weekly_brief_time text not null default '08:00',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint agent_settings_min_threat_score_check check (min_threat_score >= 6 and min_threat_score <= 10)
);

alter table public.agent_settings enable row level security;

create policy "agent_settings_select_own"
  on public.agent_settings for select
  using (auth.uid() = user_id);

create policy "agent_settings_insert_own"
  on public.agent_settings for insert
  with check (auth.uid() = user_id);

create policy "agent_settings_update_own"
  on public.agent_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.agent_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists agent_settings_updated_at on public.agent_settings;

create trigger agent_settings_updated_at
  before update on public.agent_settings
  for each row
  execute function public.agent_settings_set_updated_at();

comment on table public.agent_signals is 'Detected competitive intelligence signals before delivery decision';
comment on table public.agent_messages is 'Outbound agent intelligence messages sent to user channels';
comment on table public.agent_settings is 'Per-user Rival Agent configuration';

notify pgrst, 'reload schema';
