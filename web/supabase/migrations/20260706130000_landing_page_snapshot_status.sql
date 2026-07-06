alter table public.landing_page_snapshots
  add column if not exists status text not null default 'ok';

alter table public.landing_page_snapshots
  add constraint landing_page_snapshots_status_check
  check (status in ('ok', 'blocked'));
