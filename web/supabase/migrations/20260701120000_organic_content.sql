-- Organic social content tracking (posts, collaborators, AI insights)

-- 2.1 + 2.5: socials + scrape tracking on saved_competitors
alter table public.saved_competitors
  add column if not exists socials jsonb not null default '{}'::jsonb,
  add column if not exists organic_baseline_date timestamptz,
  add column if not exists organic_last_scraped_at timestamptz,
  add column if not exists organic_next_scrape_at timestamptz;

comment on column public.saved_competitors.socials is 'Per-platform social handles/URLs for organic post scraping';

-- 2.2: organic_posts
create table public.organic_posts (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  post_id text not null,
  content text,
  media_urls text[] not null default '{}',
  likes int not null default 0,
  comments int not null default 0,
  shares int not null default 0,
  views int not null default 0,
  posted_at timestamptz,
  scraped_at timestamptz not null default timezone('utc', now()),
  raw_data jsonb not null default '{}'::jsonb
);

create unique index organic_posts_dedup
  on public.organic_posts (competitor_id, platform, post_id);

create index organic_posts_lookup
  on public.organic_posts (competitor_id, platform, posted_at desc);

create index organic_posts_user_id_idx on public.organic_posts (user_id);

alter table public.organic_posts enable row level security;

create policy "Users access their own organic posts"
  on public.organic_posts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2.3: organic_collaborators
create table public.organic_collaborators (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  handle text not null,
  display_name text,
  profile_url text,
  avatar_url text,
  collab_types text[] not null default '{}',
  post_count int not null default 1,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

create unique index organic_collabs_dedup
  on public.organic_collaborators (competitor_id, platform, handle);

create index organic_collaborators_lookup
  on public.organic_collaborators (competitor_id, platform, post_count desc);

alter table public.organic_collaborators enable row level security;

create policy "Users access their own organic collaborators"
  on public.organic_collaborators
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2.4: organic_insights
create table public.organic_insights (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'all',
  generated_at timestamptz not null default timezone('utc', now()),
  whats_working jsonb not null default '[]'::jsonb,
  whats_flopping jsonb not null default '[]'::jsonb,
  top_collaborators jsonb not null default '[]'::jsonb,
  hot_right_now jsonb not null default '[]'::jsonb,
  metrics_overview jsonb not null default '{}'::jsonb,
  raw_analysis text,
  constraint organic_insights_competitor_platform_key unique (competitor_id, platform)
);

create index organic_insights_lookup
  on public.organic_insights (competitor_id, platform, generated_at desc);

alter table public.organic_insights enable row level security;

create policy "Users access their own organic insights"
  on public.organic_insights
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RPC: upsert collaborator with post_count increment on conflict
create or replace function public.upsert_organic_collaborator(
  p_competitor_id uuid,
  p_user_id uuid,
  p_platform text,
  p_handle text,
  p_display_name text default null,
  p_profile_url text default null,
  p_avatar_url text default null,
  p_collab_types text[] default '{}',
  p_post_count_delta int default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organic_collaborators (
    competitor_id,
    user_id,
    platform,
    handle,
    display_name,
    profile_url,
    avatar_url,
    collab_types,
    post_count,
    first_seen_at,
    last_seen_at
  )
  values (
    p_competitor_id,
    p_user_id,
    p_platform,
    p_handle,
    p_display_name,
    p_profile_url,
    p_avatar_url,
    p_collab_types,
    greatest(p_post_count_delta, 1),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (competitor_id, platform, handle)
  do update set
    display_name = coalesce(excluded.display_name, organic_collaborators.display_name),
    profile_url = coalesce(excluded.profile_url, organic_collaborators.profile_url),
    avatar_url = coalesce(excluded.avatar_url, organic_collaborators.avatar_url),
    collab_types = (
      select array_agg(distinct t)
      from unnest(organic_collaborators.collab_types || excluded.collab_types) as t
    ),
    post_count = organic_collaborators.post_count + greatest(p_post_count_delta, 1),
    last_seen_at = timezone('utc', now());
end;
$$;

grant execute on function public.upsert_organic_collaborator to authenticated;
grant execute on function public.upsert_organic_collaborator to service_role;
