alter table public.admin_user_snapshots
  add column if not exists account_suspended boolean not null default false;

create index if not exists admin_user_snapshots_account_suspended_idx
  on public.admin_user_snapshots (account_suspended)
  where account_suspended = true;
