-- Saved organic posts + saved landing pages — persistent snapshots for the unified Saved hub

-- 1. saved_organic_posts
create table if not exists public.saved_organic_posts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  source_organic_post_id uuid references public.organic_posts (id) on delete set null,
  platform text not null,
  post_id text,
  content text,
  media_urls text[] not null default '{}',
  likes int not null default 0,
  comments int not null default 0,
  shares int not null default 0,
  views int not null default 0,
  posted_at timestamptz,
  post_url text,
  product_type text,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  notes text,
  saved_by_user_id uuid not null references auth.users (id) on delete cascade,
  saved_at timestamptz not null default timezone ('utc', now()),
  created_at timestamptz not null default timezone ('utc', now()),
  updated_at timestamptz not null default timezone ('utc', now())
);

create index if not exists saved_organic_posts_user_competitor_idx on public.saved_organic_posts (user_id, competitor_id);

create index if not exists saved_organic_posts_competitor_saved_at_idx on public.saved_organic_posts (competitor_id, saved_at desc);

create index if not exists saved_organic_posts_source_idx on public.saved_organic_posts (source_organic_post_id);

create unique index if not exists saved_organic_posts_unique_per_source on public.saved_organic_posts (
  user_id,
  competitor_id,
  source_organic_post_id
)
where
  source_organic_post_id is not null;

alter table public.saved_organic_posts enable row level security;

drop policy if exists "saved_organic_posts_select_own" on public.saved_organic_posts;

create policy "saved_organic_posts_select_own" on public.saved_organic_posts for select using (auth.uid () = user_id);

drop policy if exists "saved_organic_posts_insert_own" on public.saved_organic_posts;

create policy "saved_organic_posts_insert_own" on public.saved_organic_posts for insert
with
  check (auth.uid () = user_id);

drop policy if exists "saved_organic_posts_update_own" on public.saved_organic_posts;

create policy "saved_organic_posts_update_own" on public.saved_organic_posts for update using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

drop policy if exists "saved_organic_posts_delete_own" on public.saved_organic_posts;

create policy "saved_organic_posts_delete_own" on public.saved_organic_posts for delete using (auth.uid () = user_id);

create or replace function public.saved_organic_posts_set_updated_at () returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists saved_organic_posts_updated_at on public.saved_organic_posts;

create trigger saved_organic_posts_updated_at before update on public.saved_organic_posts for each row
execute function public.saved_organic_posts_set_updated_at ();

comment on table public.saved_organic_posts is 'User-saved organic post snapshots per competitor; survives organic_posts deletion.';

-- 2. saved_landing_pages
create table if not exists public.saved_landing_pages (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  source_landing_page_id uuid references public.landing_pages (id) on delete set null,
  url text not null,
  label text not null default '',
  page_type text,
  screenshot_url text,
  hero_screenshot_url text,
  notes text,
  saved_by_user_id uuid not null references auth.users (id) on delete cascade,
  saved_at timestamptz not null default timezone ('utc', now()),
  created_at timestamptz not null default timezone ('utc', now()),
  updated_at timestamptz not null default timezone ('utc', now())
);

create index if not exists saved_landing_pages_user_competitor_idx on public.saved_landing_pages (user_id, competitor_id);

create index if not exists saved_landing_pages_competitor_saved_at_idx on public.saved_landing_pages (competitor_id, saved_at desc);

create index if not exists saved_landing_pages_source_idx on public.saved_landing_pages (source_landing_page_id);

create unique index if not exists saved_landing_pages_unique_per_source on public.saved_landing_pages (
  user_id,
  competitor_id,
  source_landing_page_id
)
where
  source_landing_page_id is not null;

alter table public.saved_landing_pages enable row level security;

drop policy if exists "saved_landing_pages_select_own" on public.saved_landing_pages;

create policy "saved_landing_pages_select_own" on public.saved_landing_pages for select using (auth.uid () = user_id);

drop policy if exists "saved_landing_pages_insert_own" on public.saved_landing_pages;

create policy "saved_landing_pages_insert_own" on public.saved_landing_pages for insert
with
  check (auth.uid () = user_id);

drop policy if exists "saved_landing_pages_update_own" on public.saved_landing_pages;

create policy "saved_landing_pages_update_own" on public.saved_landing_pages for update using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

drop policy if exists "saved_landing_pages_delete_own" on public.saved_landing_pages;

create policy "saved_landing_pages_delete_own" on public.saved_landing_pages for delete using (auth.uid () = user_id);

create or replace function public.saved_landing_pages_set_updated_at () returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists saved_landing_pages_updated_at on public.saved_landing_pages;

create trigger saved_landing_pages_updated_at before update on public.saved_landing_pages for each row
execute function public.saved_landing_pages_set_updated_at ();

comment on table public.saved_landing_pages is 'User-saved landing page pins per competitor; survives landing_pages deletion.';

notify pgrst, 'reload schema';
