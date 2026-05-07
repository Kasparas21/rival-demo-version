-- Run in Supabase Dashboard → SQL Editor (against the SAME project as NEXT_PUBLIC_SUPABASE_URL).
-- Fixes: "Could not find the table 'public.strategy_recompute_locks' in the schema cache"
--
-- After success: wait ~60s OR Settings → API → reload schema (if your plan shows it), then retry the app.

-- Core table (requires public.saved_competitors)
create table if not exists public.strategy_recompute_locks (
  competitor_id uuid primary key references public.saved_competitors (id) on delete cascade,
  locked_until timestamptz not null,
  owner_token text
);

-- Columns from strategy overview pipeline migration
alter table public.strategy_recompute_locks add column if not exists locked_at timestamptz;
alter table public.strategy_recompute_locks add column if not exists status text default 'idle';
alter table public.strategy_recompute_locks add column if not exists completed_at timestamptz;
alter table public.strategy_recompute_locks add column if not exists last_error text;
alter table public.strategy_recompute_locks add column if not exists enriched_ads integer;
alter table public.strategy_recompute_locks add column if not exists total_ads integer;

alter table public.strategy_recompute_locks drop constraint if exists strategy_recompute_locks_status_check;
alter table public.strategy_recompute_locks
  add constraint strategy_recompute_locks_status_check check (
    status is null or status = any (array['idle'::text, 'running'::text, 'failed'::text])
  );

alter table public.strategy_recompute_locks enable row level security;

drop policy if exists "strategy_recompute_locks_select_own" on public.strategy_recompute_locks;
create policy "strategy_recompute_locks_select_own"
  on public.strategy_recompute_locks for select
  using (exists (
    select 1 from public.saved_competitors sc
    where sc.id = strategy_recompute_locks.competitor_id and sc.user_id = auth.uid()
  ));

drop policy if exists "strategy_recompute_locks_insert_own" on public.strategy_recompute_locks;
create policy "strategy_recompute_locks_insert_own"
  on public.strategy_recompute_locks for insert
  with check (exists (
    select 1 from public.saved_competitors sc
    where sc.id = competitor_id and sc.user_id = auth.uid()
  ));

drop policy if exists "strategy_recompute_locks_update_own" on public.strategy_recompute_locks;
create policy "strategy_recompute_locks_update_own"
  on public.strategy_recompute_locks for update
  using (exists (
    select 1 from public.saved_competitors sc
    where sc.id = competitor_id and sc.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.saved_competitors sc
    where sc.id = competitor_id and sc.user_id = auth.uid()
  ));

drop policy if exists "strategy_recompute_locks_delete_own" on public.strategy_recompute_locks;
create policy "strategy_recompute_locks_delete_own"
  on public.strategy_recompute_locks for delete
  using (exists (
    select 1 from public.saved_competitors sc
    where sc.id = competitor_id and sc.user_id = auth.uid()
  ));

-- Ensure API roles can use the table (RLS still applies for authenticated)
grant select, insert, update, delete on table public.strategy_recompute_locks to authenticated;
grant all on table public.strategy_recompute_locks to service_role;

-- PostgREST schema cache usually refreshes within ~1–2 minutes after DDL.
-- If the API still errors, open a support note or retry after a short wait.
