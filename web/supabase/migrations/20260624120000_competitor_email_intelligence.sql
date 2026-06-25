-- Competitor email marketing intelligence (Resend inbound tracking)

create table public.competitor_email_trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  tracking_address text not null unique,
  tracking_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint competitor_email_trackers_user_competitor_key unique (user_id, competitor_id)
);

alter table public.competitor_email_trackers enable row level security;

create policy "Users manage their own email trackers"
  on public.competitor_email_trackers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.competitor_emails (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.competitor_email_trackers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  from_email text,
  from_name text,
  subject text,
  preview_text text,
  html_body text,
  plain_text text,
  received_at timestamptz not null default timezone('utc', now()),
  esp_detected text,
  email_type text,
  ai_summary text,
  ai_offers jsonb,
  ai_cta text,
  ai_angle text,
  ai_processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.competitor_emails enable row level security;

create policy "Users access their own competitor emails"
  on public.competitor_emails
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index competitor_emails_competitor_id_idx on public.competitor_emails (competitor_id);

create index competitor_emails_received_at_idx on public.competitor_emails (received_at desc);

create index competitor_email_trackers_active_code_idx
  on public.competitor_email_trackers (tracking_code)
  where is_active = true;
