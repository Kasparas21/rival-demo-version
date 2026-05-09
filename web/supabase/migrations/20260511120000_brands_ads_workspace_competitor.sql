-- Workspace onboarding: persist ad platform setup on primary brand; one hidden competitor row per user for scraping pipeline.

alter table public.brands
  add column if not exists ads_profile_setup jsonb;

alter table public.saved_competitors
  add column if not exists is_workspace_brand boolean not null default false;

create unique index if not exists saved_competitors_one_workspace_brand_per_user
  on public.saved_competitors (user_id)
  where coalesce(is_workspace_brand, false) = true;
