-- Per-client-brand autopilot watch toggles for agency accounts.
-- Keys are brand ids; missing key = primary brand on, other brands off.
alter table public.autopilot_settings
  add column if not exists watch_workspaces jsonb not null default '{}'::jsonb;

comment on column public.autopilot_settings.watch_workspaces is
  'Brand id -> watch enabled. Missing key: primary brand defaults on, others off.';
