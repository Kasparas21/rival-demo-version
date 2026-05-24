-- Weekly competitor digest email (per-user opt-out + send tracking)

alter table public.profiles
  add column if not exists weekly_digest_opted_out boolean not null default false;

alter table public.profiles
  add column if not exists last_weekly_digest_sent_at timestamptz;

comment on column public.profiles.weekly_digest_opted_out is
  'When true, skip weekly competitor digest emails. Does not affect transactional auth/billing email.';

comment on column public.profiles.last_weekly_digest_sent_at is
  'Last successful weekly digest send (used to avoid duplicate sends on cron retry).';

create table if not exists public.weekly_digest_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  competitor_count integer not null default 0,
  change_count integer not null default 0,
  resend_batch_id text,
  test_send boolean not null default false
);

create index if not exists weekly_digest_sends_user_sent_at_idx
  on public.weekly_digest_sends (user_id, sent_at desc);

alter table public.weekly_digest_sends enable row level security;

comment on table public.weekly_digest_sends is
  'Audit log for weekly digest batch sends (one row per user per send).';
