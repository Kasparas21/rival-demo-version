-- Saved folders + permanent creative archive for saved ads

create table if not exists public.saved_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint saved_folders_name_len check (char_length(trim(name)) between 1 and 80)
);

create unique index if not exists saved_folders_user_name_idx on public.saved_folders (user_id, lower(trim(name)));

create index if not exists saved_folders_user_id_idx on public.saved_folders (user_id);

alter table public.saved_ads
  add column if not exists folder_id uuid references public.saved_folders (id) on delete set null,
  add column if not exists archived_creative_url text;

create index if not exists saved_ads_folder_id_idx on public.saved_ads (folder_id);

alter table public.saved_folders enable row level security;

drop policy if exists "saved_folders_select_own" on public.saved_folders;
create policy "saved_folders_select_own" on public.saved_folders for select using (auth.uid() = user_id);

drop policy if exists "saved_folders_insert_own" on public.saved_folders;
create policy "saved_folders_insert_own" on public.saved_folders for insert with check (auth.uid() = user_id);

drop policy if exists "saved_folders_update_own" on public.saved_folders;
create policy "saved_folders_update_own" on public.saved_folders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saved_folders_delete_own" on public.saved_folders;
create policy "saved_folders_delete_own" on public.saved_folders for delete using (auth.uid() = user_id);

create or replace function public.saved_folders_set_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists saved_folders_updated_at on public.saved_folders;
create trigger saved_folders_updated_at before update on public.saved_folders for each row
execute function public.saved_folders_set_updated_at();

comment on table public.saved_folders is 'User-defined folders for organizing saved ads.';
comment on column public.saved_ads.archived_creative_url is 'Permanent Storage copy of the ad creative, captured at save time.';
