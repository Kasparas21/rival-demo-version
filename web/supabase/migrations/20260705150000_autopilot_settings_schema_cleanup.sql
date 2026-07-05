-- Align autopilot_settings schema across environments (Email + Slack only).
-- Safe to re-run: adds missing Slack columns, drops stray discord_connection if present.

DO $$
BEGIN
  IF to_regclass('public.autopilot_settings') IS NULL THEN
    RAISE EXCEPTION 'autopilot_settings table missing — run prior migrations first';
  END IF;
END $$;

ALTER TABLE public.autopilot_settings
  ADD COLUMN IF NOT EXISTS discord_webhook_url text,
  ADD COLUMN IF NOT EXISTS watch_min_score int,
  ADD COLUMN IF NOT EXISTS slack_connection jsonb;

-- discord_connection was never shipped in a migration; drop if added manually or from a bad deploy.
ALTER TABLE public.autopilot_settings
  DROP COLUMN IF EXISTS discord_connection;

COMMENT ON COLUMN public.autopilot_settings.slack_connection IS
  'OAuth display metadata only: { team_name, channel, configuration_url, connected_at }';

-- Normalize legacy watch_channels: Discord delivery is disabled.
UPDATE public.autopilot_settings
SET watch_channels = watch_channels || '{"discord": false}'::jsonb
WHERE watch_channels IS NOT NULL
  AND coalesce((watch_channels->>'discord')::boolean, false) = true;
