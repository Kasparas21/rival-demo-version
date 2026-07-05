-- Deep competitive-intelligence analysis for captured competitor emails (v2).

alter table public.competitor_emails
  add column if not exists ai_deep_analysis jsonb,
  add column if not exists ai_analysis_version text;

comment on column public.competitor_emails.ai_deep_analysis is
  'Full v2 AI competitive intelligence JSON (subject tactics, playbook, persuasion, etc.).';

comment on column public.competitor_emails.ai_analysis_version is
  'Analysis schema version (e.g. v2). Null or stale triggers lazy re-analysis on email open.';
