-- Tracks tester invite redemptions (one per user). Count enforces TESTER_INVITE_MAX_USES.
create table if not exists public.tester_invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  polar_subscription_id text,
  redeemed_at timestamptz not null default now()
);

create unique index if not exists tester_invite_redemptions_user_id_key
  on public.tester_invite_redemptions (user_id);

create index if not exists tester_invite_redemptions_invite_code_idx
  on public.tester_invite_redemptions (invite_code);

comment on table public.tester_invite_redemptions is
  'Tester cohort invite redemptions; server-only writes via service role.';

alter table public.tester_invite_redemptions enable row level security;
