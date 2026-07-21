-- Team workspace sharing: owner scrapes, invited viewers read shared data.

-- Table must exist before can_access_workspace_data() references it.
create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  member_user_id uuid references auth.users (id) on delete cascade,
  invited_email text not null,
  role text not null default 'viewer' check (role in ('viewer')),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  constraint team_memberships_owner_email_unique unique (owner_user_id, invited_email)
);

create unique index if not exists team_memberships_owner_member_unique
  on public.team_memberships (owner_user_id, member_user_id)
  where member_user_id is not null;

create index if not exists team_memberships_member_idx
  on public.team_memberships (member_user_id)
  where status = 'active';

create index if not exists team_memberships_owner_idx
  on public.team_memberships (owner_user_id);

alter table public.profiles
  add column if not exists active_workspace_owner_id uuid references auth.users (id) on delete set null;

comment on column public.profiles.active_workspace_owner_id is
  'When set, the user browses that owner''s workspace as a team viewer.';

alter table public.team_memberships enable row level security;

drop policy if exists "team_memberships_owner_select" on public.team_memberships;
create policy "team_memberships_owner_select"
  on public.team_memberships for select
  using (auth.uid() = owner_user_id or auth.uid() = member_user_id);

drop policy if exists "team_memberships_owner_insert" on public.team_memberships;
create policy "team_memberships_owner_insert"
  on public.team_memberships for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists "team_memberships_owner_update" on public.team_memberships;
create policy "team_memberships_owner_update"
  on public.team_memberships for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "team_memberships_member_accept" on public.team_memberships;
create policy "team_memberships_member_accept"
  on public.team_memberships for update
  using (
    auth.uid() = member_user_id
    or (
      member_user_id is null
      and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    auth.uid() = member_user_id
    or (
      member_user_id is null
      and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create or replace function public.can_access_workspace_data(row_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    row_user_id = auth.uid()
    or exists (
      select 1
      from public.team_memberships tm
      where tm.owner_user_id = row_user_id
        and tm.member_user_id = auth.uid()
        and tm.status = 'active'
    );
$$;

comment on function public.can_access_workspace_data(uuid) is
  'True when the row belongs to the session user or an owner who invited them as an active viewer.';

-- scraped_ads / scrape_batches
drop policy if exists "scraped_ads_select_own" on public.scraped_ads;
create policy "scraped_ads_select_own"
  on public.scraped_ads for select
  using (public.can_access_workspace_data(user_id));

drop policy if exists "scrape_batches_select_own" on public.scrape_batches;
create policy "scrape_batches_select_own"
  on public.scrape_batches for select
  using (public.can_access_workspace_data(user_id));

-- saved_competitors: split ALL policy
drop policy if exists "Users manage their own competitors" on public.saved_competitors;
drop policy if exists "saved_competitors_select_own" on public.saved_competitors;
create policy "saved_competitors_select_own"
  on public.saved_competitors for select
  using (public.can_access_workspace_data(user_id));
create policy "saved_competitors_insert_own"
  on public.saved_competitors for insert
  with check (auth.uid() = user_id);
create policy "saved_competitors_update_own"
  on public.saved_competitors for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "saved_competitors_delete_own"
  on public.saved_competitors for delete
  using (auth.uid() = user_id);

-- ads_cache
drop policy if exists "Users read own ads cache" on public.ads_cache;
drop policy if exists "ads_cache_select_own" on public.ads_cache;
create policy "ads_cache_select_own"
  on public.ads_cache for select
  using (public.can_access_workspace_data(user_id));

-- strategy_overview_cache
drop policy if exists "Users can read own strategy overview cache" on public.strategy_overview_cache;
drop policy if exists "strategy_overview_cache_select_own" on public.strategy_overview_cache;
create policy "strategy_overview_cache_select_own"
  on public.strategy_overview_cache for select
  using (public.can_access_workspace_data(user_id));

-- activity scores
drop policy if exists "competitor_activity_scores_select_own" on public.competitor_activity_scores;
create policy "competitor_activity_scores_select_own"
  on public.competitor_activity_scores for select
  using (public.can_access_workspace_data(user_id));

-- AI caches
drop policy if exists "ad_preview_analysis_cache_select_own" on public.ad_preview_analysis_cache;
create policy "ad_preview_analysis_cache_select_own"
  on public.ad_preview_analysis_cache for select
  using (public.can_access_workspace_data(user_id));

drop policy if exists "ad_copy_structure_cache_select_own" on public.ad_copy_structure_cache;
create policy "ad_copy_structure_cache_select_own"
  on public.ad_copy_structure_cache for select
  using (public.can_access_workspace_data(user_id));

-- organic
drop policy if exists "Users access their own organic posts" on public.organic_posts;
drop policy if exists "organic_posts_select_own" on public.organic_posts;
create policy "organic_posts_select_own"
  on public.organic_posts for select
  using (public.can_access_workspace_data(user_id));
create policy "organic_posts_insert_own"
  on public.organic_posts for insert
  with check (auth.uid() = user_id);
create policy "organic_posts_update_own"
  on public.organic_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "organic_posts_delete_own"
  on public.organic_posts for delete
  using (auth.uid() = user_id);

drop policy if exists "Users access their own organic insights" on public.organic_insights;
drop policy if exists "organic_insights_select_own" on public.organic_insights;
create policy "organic_insights_select_own"
  on public.organic_insights for select
  using (public.can_access_workspace_data(user_id));
create policy "organic_insights_insert_own"
  on public.organic_insights for insert
  with check (auth.uid() = user_id);
create policy "organic_insights_update_own"
  on public.organic_insights for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "organic_insights_delete_own"
  on public.organic_insights for delete
  using (auth.uid() = user_id);

drop policy if exists "organic_post_preview_analysis_cache_select_own" on public.organic_post_preview_analysis_cache;
create policy "organic_post_preview_analysis_cache_select_own"
  on public.organic_post_preview_analysis_cache for select
  using (public.can_access_workspace_data(user_id));

-- landing pages
drop policy if exists "Users access their own landing pages" on public.landing_pages;
drop policy if exists "landing_pages_select_own" on public.landing_pages;
create policy "landing_pages_select_own"
  on public.landing_pages for select
  using (public.can_access_workspace_data(user_id));
create policy "landing_pages_insert_own"
  on public.landing_pages for insert
  with check (auth.uid() = user_id);
create policy "landing_pages_update_own"
  on public.landing_pages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "landing_pages_delete_own"
  on public.landing_pages for delete
  using (auth.uid() = user_id);

-- emails
drop policy if exists "Users access their own competitor emails" on public.competitor_emails;
create policy "competitor_emails_select_shared"
  on public.competitor_emails for select
  using (public.can_access_workspace_data(user_id));
create policy "competitor_emails_insert_own"
  on public.competitor_emails for insert
  with check (auth.uid() = user_id);
create policy "competitor_emails_update_own"
  on public.competitor_emails for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "competitor_emails_delete_own"
  on public.competitor_emails for delete
  using (auth.uid() = user_id);

-- brands / brand_competitors
drop policy if exists "Users manage own brands" on public.brands;
drop policy if exists "brands_select_own" on public.brands;
create policy "brands_select_own"
  on public.brands for select
  using (public.can_access_workspace_data(user_id));
create policy "brands_insert_own"
  on public.brands for insert
  with check (auth.uid() = user_id);
create policy "brands_update_own"
  on public.brands for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "brands_delete_own"
  on public.brands for delete
  using (auth.uid() = user_id);

alter table public.brand_competitors enable row level security;

drop policy if exists "brand_competitors_select_own" on public.brand_competitors;
create policy "brand_competitors_select_own"
  on public.brand_competitors for select
  using (public.can_access_workspace_data(user_id));
create policy "brand_competitors_insert_own"
  on public.brand_competitors for insert
  with check (auth.uid() = user_id);
create policy "brand_competitors_update_own"
  on public.brand_competitors for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "brand_competitors_delete_own"
  on public.brand_competitors for delete
  using (auth.uid() = user_id);
