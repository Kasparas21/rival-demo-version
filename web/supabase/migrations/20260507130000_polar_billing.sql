-- Polar subscription state. Mutations are owned by verified server-side webhooks.
create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  polar_customer_id text,
  polar_subscription_id text unique,
  polar_product_id text not null,
  status text not null default 'none',
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  started_at timestamptz,
  ends_at timestamptz,
  ended_at timestamptz,
  checkout_id text,
  last_webhook_event_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.billing_subscriptions is 'Current Polar subscription state per user, updated only from verified webhooks.';

create index if not exists billing_subscriptions_polar_customer_id_idx
  on public.billing_subscriptions (polar_customer_id);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions (status);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "billing_subscriptions_select_own" on public.billing_subscriptions;
create policy "billing_subscriptions_select_own"
  on public.billing_subscriptions for select
  using (auth.uid() = user_id);

create table if not exists public.billing_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb
);

comment on table public.billing_webhook_events is 'Idempotency ledger for Polar webhook events.';

alter table public.billing_webhook_events enable row level security;
