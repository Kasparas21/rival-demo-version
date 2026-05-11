-- Cached Haiku extraction of ad copy structure (Comparison Copy Vault modal).

create table if not exists public.ad_copy_structure_cache (
  ad_id uuid primary key references public.scraped_ads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  structure jsonb not null,
  computed_at timestamptz not null default timezone('utc', now()),
  ai_model_version text not null
);

create index if not exists idx_ad_copy_structure_user on public.ad_copy_structure_cache (user_id, computed_at desc);

alter table public.ad_copy_structure_cache enable row level security;

drop policy if exists "ad_copy_structure_cache_select_own" on public.ad_copy_structure_cache;
create policy "ad_copy_structure_cache_select_own"
  on public.ad_copy_structure_cache for select
  using (auth.uid() = user_id);

drop policy if exists "ad_copy_structure_cache_insert_own" on public.ad_copy_structure_cache;
create policy "ad_copy_structure_cache_insert_own"
  on public.ad_copy_structure_cache for insert
  with check (auth.uid() = user_id);

drop policy if exists "ad_copy_structure_cache_update_own" on public.ad_copy_structure_cache;
create policy "ad_copy_structure_cache_update_own"
  on public.ad_copy_structure_cache for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ad_copy_structure_cache_delete_own" on public.ad_copy_structure_cache;
create policy "ad_copy_structure_cache_delete_own"
  on public.ad_copy_structure_cache for delete
  using (auth.uid() = user_id);
