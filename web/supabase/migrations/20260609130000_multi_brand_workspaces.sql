-- Multi-brand agency workspaces.
-- Competitor/ad data remains canonical in saved_competitors; this table scopes
-- which competitors appear under each own brand workspace.

alter table public.brands
  add column if not exists workspace_competitor_id uuid references public.saved_competitors(id) on delete set null;

drop index if exists public.saved_competitors_one_workspace_brand_per_user;

create table if not exists public.brand_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_id uuid not null references public.brands(id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brand_id, competitor_id)
);

create index if not exists brand_competitors_user_brand_idx
  on public.brand_competitors (user_id, brand_id);

create index if not exists brand_competitors_competitor_idx
  on public.brand_competitors (competitor_id);

-- Link existing workspace rows to each user's primary brand.
update public.brands b
set workspace_competitor_id = sc.id
from public.saved_competitors sc
where b.workspace_competitor_id is null
  and b.user_id = sc.user_id
  and coalesce(sc.is_workspace_brand, false) = true
  and b.id = (
    select b2.id
    from public.brands b2
    where b2.user_id = b.user_id
    order by b2.is_primary desc, b2.created_at asc
    limit 1
  );

-- Backfill all existing non-workspace competitors to the primary brand.
insert into public.brand_competitors (user_id, brand_id, competitor_id)
select sc.user_id, b.id, sc.id
from public.saved_competitors sc
join lateral (
  select b2.id
  from public.brands b2
  where b2.user_id = sc.user_id
  order by b2.is_primary desc, b2.created_at asc
  limit 1
) b on true
where coalesce(sc.is_workspace_brand, false) = false
on conflict (user_id, brand_id, competitor_id) do nothing;
