-- Secure token for team invite email links (magic link → accept → workspace picker).

alter table public.team_memberships
  add column if not exists invite_token uuid default gen_random_uuid();

update public.team_memberships
set invite_token = gen_random_uuid()
where invite_token is null;

alter table public.team_memberships
  alter column invite_token set not null;

create unique index if not exists team_memberships_invite_token_unique
  on public.team_memberships (invite_token);

alter table public.team_memberships
  add column if not exists invite_token_expires_at timestamptz;

update public.team_memberships
set invite_token_expires_at = created_at + interval '30 days'
where status = 'pending'
  and invite_token_expires_at is null;

comment on column public.team_memberships.invite_token is
  'Opaque token embedded in invite email links; maps to a pending membership.';
comment on column public.team_memberships.invite_token_expires_at is
  'Pending invites expire after this time (default 30 days from creation).';
