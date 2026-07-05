-- Saved emails — persistent snapshots of captured competitor emails

create table if not exists public.saved_emails (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  source_competitor_email_id uuid references public.competitor_emails (id) on delete set null,
  from_email text,
  from_name text,
  subject text,
  preview_text text,
  html_body text,
  plain_text text,
  received_at timestamptz,
  esp_detected text,
  email_type text,
  ai_summary text,
  ai_offers jsonb,
  ai_cta text,
  ai_angle text,
  ai_deep_analysis jsonb,
  ai_analysis_version text,
  notes text,
  saved_by_user_id uuid not null references auth.users (id) on delete cascade,
  saved_at timestamptz not null default timezone ('utc', now()),
  created_at timestamptz not null default timezone ('utc', now()),
  updated_at timestamptz not null default timezone ('utc', now())
);

create index if not exists saved_emails_user_competitor_idx on public.saved_emails (user_id, competitor_id);

create index if not exists saved_emails_competitor_saved_at_idx on public.saved_emails (competitor_id, saved_at desc);

create index if not exists saved_emails_source_email_idx on public.saved_emails (source_competitor_email_id);

create unique index if not exists saved_emails_unique_per_source on public.saved_emails (
  user_id,
  competitor_id,
  source_competitor_email_id
)
where
  source_competitor_email_id is not null;

alter table public.saved_emails enable row level security;

drop policy if exists "saved_emails_select_own" on public.saved_emails;

create policy "saved_emails_select_own" on public.saved_emails for select using (auth.uid () = user_id);

drop policy if exists "saved_emails_insert_own" on public.saved_emails;

create policy "saved_emails_insert_own" on public.saved_emails for insert
with
  check (auth.uid () = user_id);

drop policy if exists "saved_emails_update_own" on public.saved_emails;

create policy "saved_emails_update_own" on public.saved_emails for update using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

drop policy if exists "saved_emails_delete_own" on public.saved_emails;

create policy "saved_emails_delete_own" on public.saved_emails for delete using (auth.uid () = user_id);

create or replace function public.saved_emails_set_updated_at () returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists saved_emails_updated_at on public.saved_emails;

create trigger saved_emails_updated_at before update on public.saved_emails for each row
execute function public.saved_emails_set_updated_at ();

comment on table public.saved_emails is 'User-saved email snapshots per competitor; survives competitor_emails deletion.';
