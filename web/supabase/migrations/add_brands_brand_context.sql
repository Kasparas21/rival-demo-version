-- Brand “about” / positioning text (from onboarding homepage scrape or user-edited in settings).
alter table public.brands add column if not exists brand_context text;
