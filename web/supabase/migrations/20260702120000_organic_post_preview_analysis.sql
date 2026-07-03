-- Per-user cache for organic post preview AI analysis

create table if not exists public.organic_post_preview_analysis_cache (
  organic_post_id uuid not null references public.organic_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis jsonb not null default '{}'::jsonb,
  ai_model_version text not null,
  computed_at timestamptz not null default timezone('utc', now()),
  primary key (organic_post_id, user_id)
);

create index if not exists idx_organic_post_preview_analysis_user
  on public.organic_post_preview_analysis_cache (user_id, computed_at desc);

comment on table public.organic_post_preview_analysis_cache is
  'Cached AI analysis for individual organic social posts (per user).';

alter table public.organic_post_preview_analysis_cache enable row level security;

drop policy if exists "organic_post_preview_analysis_select_own" on public.organic_post_preview_analysis_cache;
create policy "organic_post_preview_analysis_select_own"
  on public.organic_post_preview_analysis_cache for select
  using (auth.uid() = user_id);

drop policy if exists "organic_post_preview_analysis_insert_own" on public.organic_post_preview_analysis_cache;
create policy "organic_post_preview_analysis_insert_own"
  on public.organic_post_preview_analysis_cache for insert
  with check (auth.uid() = user_id);

drop policy if exists "organic_post_preview_analysis_update_own" on public.organic_post_preview_analysis_cache;
create policy "organic_post_preview_analysis_update_own"
  on public.organic_post_preview_analysis_cache for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "organic_post_preview_analysis_delete_own" on public.organic_post_preview_analysis_cache;
create policy "organic_post_preview_analysis_delete_own"
  on public.organic_post_preview_analysis_cache for delete
  using (auth.uid() = user_id);
