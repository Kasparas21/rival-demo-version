-- Cached brand-vs-competitors benchmark payload (invalidated by combined ads fingerprint).

create table if not exists public.brand_benchmark_cache (
  user_id uuid primary key references auth.users (id) on delete cascade,
  combined_fingerprint text not null,
  payload jsonb not null,
  ai_model text,
  computed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_benchmark_cache_fingerprint_idx
  on public.brand_benchmark_cache (combined_fingerprint);

alter table public.brand_benchmark_cache enable row level security;

comment on table public.brand_benchmark_cache is
  'Cached GET /api/brand/benchmark payload keyed by user + combined entity fingerprints.';

notify pgrst, 'reload schema';
