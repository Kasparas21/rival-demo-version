-- Historical strategy payloads for move detection + persisted moves.

create table if not exists public.competitor_strategy_overview_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  payload jsonb not null,
  source_scrape_batch_id uuid references public.scrape_batches (id) on delete set null,
  ai_model_version text not null,
  computed_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_strategy_snapshots_competitor_time
  on public.competitor_strategy_overview_snapshots (competitor_id, computed_at desc);

alter table public.competitor_strategy_overview_snapshots enable row level security;

drop policy if exists "strategy_snapshots_select_own" on public.competitor_strategy_overview_snapshots;
create policy "strategy_snapshots_select_own"
  on public.competitor_strategy_overview_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "strategy_snapshots_insert_own" on public.competitor_strategy_overview_snapshots;
create policy "strategy_snapshots_insert_own"
  on public.competitor_strategy_overview_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "strategy_snapshots_delete_own" on public.competitor_strategy_overview_snapshots;
create policy "strategy_snapshots_delete_own"
  on public.competitor_strategy_overview_snapshots for delete
  using (auth.uid() = user_id);

alter table public.saved_competitors
  add column if not exists last_move_detection_at timestamptz;

create table if not exists public.competitor_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  event_type text not null,
  significance text not null,
  detected_at timestamptz not null default timezone('utc', now()),
  platform text,
  before_state jsonb,
  after_state jsonb,
  narrative text,
  ai_model_version text,
  source_snapshot_id_before uuid references public.competitor_strategy_overview_snapshots (id) on delete set null,
  source_snapshot_id_after uuid references public.competitor_strategy_overview_snapshots (id) on delete set null
);

create index if not exists idx_competitor_moves_competitor_time
  on public.competitor_moves (competitor_id, detected_at desc);

alter table public.competitor_moves enable row level security;

drop policy if exists "competitor_moves_select_own" on public.competitor_moves;
create policy "competitor_moves_select_own"
  on public.competitor_moves for select
  using (auth.uid() = user_id);

drop policy if exists "competitor_moves_insert_own" on public.competitor_moves;
create policy "competitor_moves_insert_own"
  on public.competitor_moves for insert
  with check (auth.uid() = user_id);

drop policy if exists "competitor_moves_delete_own" on public.competitor_moves;
create policy "competitor_moves_delete_own"
  on public.competitor_moves for delete
  using (auth.uid() = user_id);
