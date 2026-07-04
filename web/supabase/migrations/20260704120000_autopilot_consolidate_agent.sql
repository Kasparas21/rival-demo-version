-- =============================================================================
-- Autopilot + Rival Agent consolidation
-- Adds Discord + score threshold; migrates agent_settings → autopilot_settings
-- Does NOT drop agent_settings.
--
-- Pre-check (run first):
--   select to_regclass('public.autopilot_settings');
--   select to_regclass('public.agent_settings');
-- =============================================================================

-- 1. Schema additions
alter table public.autopilot_settings
  add column if not exists discord_webhook_url text,
  add column if not exists watch_min_score int
    constraint autopilot_settings_watch_min_score_check
      check (watch_min_score is null or (watch_min_score >= 6 and watch_min_score <= 10));

comment on column public.autopilot_settings.discord_webhook_url is
  'Discord incoming webhook URL for autopilot watch delivery';
comment on column public.autopilot_settings.watch_min_score is
  'When set, watch filters alerts where alertWatchScore >= watch_min_score; else watch_sensitivity rules apply';

-- 2. Upsert from agent_settings (agent-only users get a row; dual users merge)
insert into public.autopilot_settings (
  user_id,
  enabled,
  watch_channels,
  slack_webhook_url,
  discord_webhook_url,
  watch_min_score,
  watch_sensitivity,
  updated_at
)
select
  ag.user_id,
  ag.enabled,
  jsonb_build_object(
    'email', coalesce((ag.channels->'email'->>'enabled')::boolean, true),
    'slack', coalesce((ag.channels->'slack'->>'enabled')::boolean, false),
    'discord', coalesce((ag.channels->'discord'->>'enabled')::boolean, false)
  ),
  nullif(trim(ag.channels->'slack'->>'webhook_url'), ''),
  nullif(trim(ag.channels->'discord'->>'webhook_url'), ''),
  case
    when ag.min_threat_score is null then null
    when ag.min_threat_score < 6 or ag.min_threat_score > 10 then null
    when least(10, greatest(6, ag.min_threat_score)) >= 9 then 9
    when least(10, greatest(6, ag.min_threat_score)) >= 8 then 8
    else 6
  end,
  case
    when ag.min_threat_score is null then 'balanced'
    when least(10, greatest(6, coalesce(ag.min_threat_score, 6))) >= 9 then 'big_moves'
    when least(10, greatest(6, coalesce(ag.min_threat_score, 6))) >= 8 then 'big_moves'
    else 'balanced'
  end,
  timezone('utc', now())
from public.agent_settings ag
on conflict (user_id) do update set
  enabled = public.autopilot_settings.enabled,

  watch_channels = jsonb_build_object(
    'email', coalesce(
      (public.autopilot_settings.watch_channels->>'email')::boolean,
      (excluded.watch_channels->>'email')::boolean,
      true
    ),
    'slack', coalesce(
      (public.autopilot_settings.watch_channels->>'slack')::boolean,
      (excluded.watch_channels->>'slack')::boolean,
      false
    ),
    'discord', coalesce(
      (public.autopilot_settings.watch_channels->>'discord')::boolean,
      (excluded.watch_channels->>'discord')::boolean,
      false
    )
  ),

  slack_webhook_url = coalesce(
    nullif(trim(public.autopilot_settings.slack_webhook_url), ''),
    excluded.slack_webhook_url
  ),

  discord_webhook_url = coalesce(
    nullif(trim(public.autopilot_settings.discord_webhook_url), ''),
    excluded.discord_webhook_url
  ),

  watch_min_score = coalesce(
    public.autopilot_settings.watch_min_score,
    excluded.watch_min_score
  ),

  watch_sensitivity = public.autopilot_settings.watch_sensitivity,

  updated_at = timezone('utc', now());

-- weekly_brief_enabled intentionally NOT migrated — superseded by autopilot Phase 3 brief_enabled scaffold

-- 3. Backfill discord:false only after upsert (so agent discord:true can flow through coalesce)
update public.autopilot_settings
set watch_channels = watch_channels || '{"discord": false}'::jsonb
where not (watch_channels ? 'discord');

notify pgrst, 'reload schema';
