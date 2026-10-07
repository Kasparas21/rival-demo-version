-- Objects only the server (service role) uses were callable by anyone with the public key.
-- Both functions are SECURITY DEFINER and take a user id argument, so any visitor could bump another
-- user's email-analysis quota or write organic collaborator rows for them. The cron lock table had no RLS,
-- so anyone could read or take the Autopilot cron locks. Service role bypasses all of this.

revoke execute on function public.increment_email_intelligence_analysis_usage(uuid) from public, anon, authenticated;

revoke execute on function public.upsert_organic_collaborator(
  uuid, uuid, text, text, text, text, text, text[], integer
) from public, anon, authenticated;

alter table public.autopilot_cron_locks enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this table.
