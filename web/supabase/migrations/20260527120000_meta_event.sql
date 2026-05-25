-- Idempotency ledger for Meta Conversions API events triggered from Polar order.paid webhooks.
create table if not exists public.meta_event (
  order_id text primary key,
  event_name text not null default 'Purchase',
  sent_at timestamptz not null default now(),
  meta_response jsonb
);

comment on table public.meta_event is 'One row per Polar order.id sent to Meta CAPI (Purchase).';

alter table public.meta_event enable row level security;
