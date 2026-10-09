-- Recommended competitors: one cached run per website domain, shared by every account with that domain,
-- so the paid search (model calls, Firecrawl, Apify) runs once rather than per visit or per user.
-- Only the server (service role) reads or writes it; the API checks the caller owns a brand with the domain.

create table if not exists public.competitor_recommendations (
  domain text primary key,
  status text not null check (status in ('running', 'done', 'failed')),
  result jsonb,
  error text,
  cost_usd numeric(8, 4),
  requested_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.competitor_recommendations enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this table.
revoke all on table public.competitor_recommendations from anon, authenticated;
