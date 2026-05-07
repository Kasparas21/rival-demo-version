-- Strategy Overview pipeline: enrichment status + recompute lock observability

alter table public.scraped_ads
  add column if not exists ai_enrichment_status text default 'pending';

update public.scraped_ads
set ai_enrichment_status = 'enriched'
where coalesce(trim(ai_extracted_angle), '') <> ''
  and coalesce(trim(funnel_stage), '') <> '';

alter table public.scraped_ads drop constraint if exists scraped_ads_ai_enrichment_status_check;

alter table public.scraped_ads
  add constraint scraped_ads_ai_enrichment_status_check check (
    ai_enrichment_status = any (
      array['pending'::text, 'enriched'::text, 'failed'::text, 'skipped_no_text'::text]
    )
  );

create index if not exists scraped_ads_enrichment_status_idx
  on public.scraped_ads (competitor_id, ai_enrichment_status)
  where is_active = true;

alter table public.strategy_recompute_locks
  add column if not exists locked_at timestamptz;

alter table public.strategy_recompute_locks
  add column if not exists status text default 'idle';

alter table public.strategy_recompute_locks
  add column if not exists completed_at timestamptz;

alter table public.strategy_recompute_locks
  add column if not exists last_error text;

alter table public.strategy_recompute_locks
  add column if not exists enriched_ads integer;

alter table public.strategy_recompute_locks
  add column if not exists total_ads integer;

alter table public.strategy_recompute_locks drop constraint if exists strategy_recompute_locks_status_check;

alter table public.strategy_recompute_locks
  add constraint strategy_recompute_locks_status_check check (
    status is null or status = any (array['idle'::text, 'running'::text, 'failed'::text])
  );
