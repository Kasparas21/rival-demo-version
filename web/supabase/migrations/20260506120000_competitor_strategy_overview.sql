-- Full Strategy Map + Strategy Insight payload cache (per competitor), funnel edges, insight cards, enrichment log.

create table if not exists public.competitor_strategy_overview (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  source_scrape_batch_id uuid references public.scrape_batches (id) on delete set null,
  ai_model_version text not null default '',
  computed_at timestamptz not null default timezone('utc', now()),
  constraint competitor_strategy_overview_competitor_unique unique (competitor_id)
);

create index if not exists competitor_strategy_overview_user_idx on public.competitor_strategy_overview (user_id);
create index if not exists competitor_strategy_overview_batch_idx on public.competitor_strategy_overview (source_scrape_batch_id);

create table if not exists public.funnel_flow_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  from_platform text not null,
  to_platform text not null,
  confidence_score double precision not null,
  reasoning text,
  edge_style text not null default 'dashed'
    constraint funnel_flow_edges_style_check check (edge_style = any (array['solid'::text, 'dashed'::text])),
  detected_at timestamptz not null default timezone('utc', now())
);

create index if not exists funnel_flow_edges_competitor_idx on public.funnel_flow_edges (competitor_id);
create index if not exists funnel_flow_edges_user_idx on public.funnel_flow_edges (user_id);

create table if not exists public.strategy_insights_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  card_type text not null,
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  constraint strategy_insights_cards_type_check check (
    card_type = any (
      array[
        'funnel_architecture'::text,
        'budget_allocation'::text,
        'creative_cadence'::text,
        'audience_signal_map'::text,
        'angle_clustering'::text,
        'voice_tone_fingerprint'::text,
        'performance_pulse'::text
      ]
    )
  ),
  constraint strategy_insights_cards_competitor_type_key unique (competitor_id, card_type)
);

create index if not exists strategy_insights_cards_competitor_idx on public.strategy_insights_cards (competitor_id);

create table if not exists public.ad_enrichment_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scraped_ad_id uuid not null references public.scraped_ads (id) on delete cascade,
  content_hash text not null,
  model text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ad_enrichment_log_ad_hash_key unique (scraped_ad_id, content_hash)
);

create index if not exists ad_enrichment_log_user_idx on public.ad_enrichment_log (user_id);

-- Serialized recompute lock per competitor (prevents duplicate concurrent jobs without long transactions)
create table if not exists public.strategy_recompute_locks (
  competitor_id uuid primary key references public.saved_competitors (id) on delete cascade,
  locked_until timestamptz not null,
  owner_token text
);

alter table public.competitor_strategy_overview enable row level security;
alter table public.funnel_flow_edges enable row level security;
alter table public.strategy_insights_cards enable row level security;
alter table public.ad_enrichment_log enable row level security;
alter table public.strategy_recompute_locks enable row level security;

drop policy if exists "competitor_strategy_overview_select_own" on public.competitor_strategy_overview;
create policy "competitor_strategy_overview_select_own"
  on public.competitor_strategy_overview for select
  using (auth.uid() = user_id);

drop policy if exists "competitor_strategy_overview_insert_own" on public.competitor_strategy_overview;
create policy "competitor_strategy_overview_insert_own"
  on public.competitor_strategy_overview for insert
  with check (auth.uid() = user_id);

drop policy if exists "competitor_strategy_overview_update_own" on public.competitor_strategy_overview;
create policy "competitor_strategy_overview_update_own"
  on public.competitor_strategy_overview for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "competitor_strategy_overview_delete_own" on public.competitor_strategy_overview;
create policy "competitor_strategy_overview_delete_own"
  on public.competitor_strategy_overview for delete
  using (auth.uid() = user_id);

drop policy if exists "funnel_flow_edges_select_own" on public.funnel_flow_edges;
create policy "funnel_flow_edges_select_own"
  on public.funnel_flow_edges for select
  using (auth.uid() = user_id);

drop policy if exists "funnel_flow_edges_insert_own" on public.funnel_flow_edges;
create policy "funnel_flow_edges_insert_own"
  on public.funnel_flow_edges for insert
  with check (auth.uid() = user_id);

drop policy if exists "funnel_flow_edges_update_own" on public.funnel_flow_edges;
create policy "funnel_flow_edges_update_own"
  on public.funnel_flow_edges for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "funnel_flow_edges_delete_own" on public.funnel_flow_edges;
create policy "funnel_flow_edges_delete_own"
  on public.funnel_flow_edges for delete
  using (auth.uid() = user_id);

drop policy if exists "strategy_insights_cards_select_own" on public.strategy_insights_cards;
create policy "strategy_insights_cards_select_own"
  on public.strategy_insights_cards for select
  using (auth.uid() = user_id);

drop policy if exists "strategy_insights_cards_insert_own" on public.strategy_insights_cards;
create policy "strategy_insights_cards_insert_own"
  on public.strategy_insights_cards for insert
  with check (auth.uid() = user_id);

drop policy if exists "strategy_insights_cards_update_own" on public.strategy_insights_cards;
create policy "strategy_insights_cards_update_own"
  on public.strategy_insights_cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "strategy_insights_cards_delete_own" on public.strategy_insights_cards;
create policy "strategy_insights_cards_delete_own"
  on public.strategy_insights_cards for delete
  using (auth.uid() = user_id);

drop policy if exists "ad_enrichment_log_select_own" on public.ad_enrichment_log;
create policy "ad_enrichment_log_select_own"
  on public.ad_enrichment_log for select
  using (auth.uid() = user_id);

drop policy if exists "ad_enrichment_log_insert_own" on public.ad_enrichment_log;
create policy "ad_enrichment_log_insert_own"
  on public.ad_enrichment_log for insert
  with check (auth.uid() = user_id);

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

comment on table public.competitor_strategy_overview is 'Cached Strategy Map + Insight JSON per competitor; invalidate when source_scrape_batch_id changes.';
