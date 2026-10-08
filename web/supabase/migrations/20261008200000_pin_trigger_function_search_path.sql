-- Pin search_path on the updated_at trigger functions (Supabase advisor: function_search_path_mutable).
-- Each body only calls timezone() and now(), which resolve from pg_catalog with an empty search_path,
-- so behaviour is unchanged; a caller's search_path can no longer redirect them.
alter function public.agent_settings_set_updated_at() set search_path = '';
alter function public.alert_rules_set_updated_at() set search_path = '';
alter function public.autopilot_settings_set_updated_at() set search_path = '';
alter function public.saved_ads_set_updated_at() set search_path = '';
alter function public.saved_emails_set_updated_at() set search_path = '';
alter function public.saved_folders_set_updated_at() set search_path = '';
alter function public.saved_landing_pages_set_updated_at() set search_path = '';
alter function public.saved_organic_posts_set_updated_at() set search_path = '';
alter function public.set_updated_at() set search_path = '';
