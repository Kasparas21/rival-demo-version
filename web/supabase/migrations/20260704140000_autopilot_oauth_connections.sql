-- OAuth display metadata for Slack (webhook URL stays in slack_webhook_url).

DO $$
BEGIN
  IF to_regclass('public.autopilot_settings') IS NULL THEN
    RAISE EXCEPTION 'autopilot_settings table missing — run prior migrations first';
  END IF;
END $$;

ALTER TABLE public.autopilot_settings
  ADD COLUMN IF NOT EXISTS slack_connection jsonb;

COMMENT ON COLUMN public.autopilot_settings.slack_connection IS
  'OAuth display metadata only: { team_name, channel, configuration_url, connected_at }';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'autopilot_settings'
      AND column_name = 'slack_connection'
  ) THEN
    RAISE EXCEPTION 'slack_connection column not created';
  END IF;
END $$;
