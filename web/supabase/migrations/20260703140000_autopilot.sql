-- Autopilot Mode: settings, outputs, cron locks, alert processing column

alter table public.competitor_alerts
  add column if not exists autopilot_processed_at timestamptz;

create index if not exists competitor_alerts_autopilot_unprocessed_idx
  on public.competitor_alerts (user_id, autopilot_processed_at)
  where autopilot_processed_at is null;

comment on column public.competitor_alerts.autopilot_processed_at is
  'Set when Autopilot Auto-Watch has delivered or suppressed this alert (independent of notified_at / legacy alert emails).';

-- ---------------------------------------------------------------------------
-- autopilot_settings
-- ---------------------------------------------------------------------------

create table if not exists public.autopilot_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade unique,
  enabled boolean not null default false,
  watch_enabled boolean not null default true,
  watch_sensitivity text not null default 'balanced'
    check (watch_sensitivity in ('paranoid', 'balanced', 'big_moves')),
  watch_channels jsonb not null default '{"email": true, "slack": false}'::jsonb,
  slack_webhook_url text,
  watch_competitor_ids uuid[],
  watch_quiet_hours jsonb not null default '{"start": 22, "end": 7, "timezone": "Europe/London"}'::jsonb,
  report_enabled boolean not null default false,
  report_day_of_month int not null default 1
    check (report_day_of_month >= 1 and report_day_of_month <= 28),
  report_branding jsonb not null default '{"logo_url": null, "agency_name": null, "accent_color": null, "hide_powered_by": false}'::jsonb,
  report_workspaces jsonb not null default '{}'::jsonb,
  brief_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.autopilot_settings enable row level security;

create policy "autopilot_settings_select_own"
  on public.autopilot_settings for select
  using (auth.uid() = user_id);

create policy "autopilot_settings_insert_own"
  on public.autopilot_settings for insert
  with check (auth.uid() = user_id);

create policy "autopilot_settings_update_own"
  on public.autopilot_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- autopilot_outputs
-- ---------------------------------------------------------------------------

create table if not exists public.autopilot_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  output_type text not null
    check (output_type in ('watch_alert', 'monthly_report', 'weekly_brief')),
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  channels_sent jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'suppressed')),
  error text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

create unique index if not exists autopilot_outputs_dedupe_key_idx
  on public.autopilot_outputs (dedupe_key);

create index if not exists autopilot_outputs_user_created_idx
  on public.autopilot_outputs (user_id, created_at desc);

alter table public.autopilot_outputs enable row level security;

create policy "autopilot_outputs_select_own"
  on public.autopilot_outputs for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- autopilot_cron_locks
-- ---------------------------------------------------------------------------

create table if not exists public.autopilot_cron_locks (
  job_name text primary key,
  locked_until timestamptz not null default timezone('utc', now()),
  owner_token text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.autopilot_cron_locks is
  'Advisory locks for autopilot cron jobs (watch/report) to avoid overlapping serverless invocations.';

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.autopilot_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists autopilot_settings_updated_at on public.autopilot_settings;

create trigger autopilot_settings_updated_at
  before update on public.autopilot_settings
  for each row
  execute function public.autopilot_settings_set_updated_at();

comment on table public.autopilot_settings is 'Per-user Autopilot Mode configuration (watch, report, brief placeholder)';
comment on table public.autopilot_outputs is 'Generated autopilot outputs for dedupe, delivery audit, and history UI';

notify pgrst, 'reload schema';
