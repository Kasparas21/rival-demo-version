-- Competitor alerts feed + user alert rules

create table if not exists public.competitor_alerts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.saved_competitors (id) on delete cascade,
  alert_type text not null,
  severity text not null default 'info',
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default timezone ('utc', now()),
  source_scrape_batch_id uuid references public.scrape_batches (id) on delete set null,
  is_read boolean not null default false,
  notified_at timestamptz,
  dedupe_key text not null,
  created_at timestamptz not null default timezone ('utc', now()),
  constraint competitor_alerts_dedupe unique (user_id, competitor_id, dedupe_key),
  constraint competitor_alerts_severity_check check (severity in ('info', 'notable', 'high'))
);

create index if not exists competitor_alerts_user_detected_idx on public.competitor_alerts (user_id, detected_at desc);

create index if not exists competitor_alerts_user_competitor_detected_idx on public.competitor_alerts (
  user_id,
  competitor_id,
  detected_at desc
);

create index if not exists competitor_alerts_user_unread_idx on public.competitor_alerts (user_id, is_read)
where
  not is_read;

create index if not exists competitor_alerts_user_unnotified_idx on public.competitor_alerts (user_id, notified_at)
where
  notified_at is null;

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_type text not null,
  enabled boolean not null default true,
  notify_email boolean not null default false,
  threshold jsonb not null default '{}'::jsonb,
  competitor_id uuid references public.saved_competitors (id) on delete cascade,
  created_at timestamptz not null default timezone ('utc', now()),
  updated_at timestamptz not null default timezone ('utc', now()),
  constraint alert_rules_unique unique nulls not distinct (user_id, alert_type, competitor_id)
);

create index if not exists alert_rules_user_idx on public.alert_rules (user_id);

alter table public.competitor_alerts enable row level security;

alter table public.alert_rules enable row level security;

drop policy if exists "competitor_alerts_select_own" on public.competitor_alerts;

create policy "competitor_alerts_select_own" on public.competitor_alerts for select using (auth.uid () = user_id);

drop policy if exists "competitor_alerts_insert_own" on public.competitor_alerts;

create policy "competitor_alerts_insert_own" on public.competitor_alerts for insert
with
  check (auth.uid () = user_id);

drop policy if exists "competitor_alerts_update_own" on public.competitor_alerts;

create policy "competitor_alerts_update_own" on public.competitor_alerts for update using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

drop policy if exists "competitor_alerts_delete_own" on public.competitor_alerts;

create policy "competitor_alerts_delete_own" on public.competitor_alerts for delete using (auth.uid () = user_id);

drop policy if exists "alert_rules_select_own" on public.alert_rules;

create policy "alert_rules_select_own" on public.alert_rules for select using (auth.uid () = user_id);

drop policy if exists "alert_rules_insert_own" on public.alert_rules;

create policy "alert_rules_insert_own" on public.alert_rules for insert
with
  check (auth.uid () = user_id);

drop policy if exists "alert_rules_update_own" on public.alert_rules;

create policy "alert_rules_update_own" on public.alert_rules for update using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

drop policy if exists "alert_rules_delete_own" on public.alert_rules;

create policy "alert_rules_delete_own" on public.alert_rules for delete using (auth.uid () = user_id);

create or replace function public.alert_rules_set_updated_at () returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists alert_rules_updated_at on public.alert_rules;

create trigger alert_rules_updated_at before update on public.alert_rules for each row
execute function public.alert_rules_set_updated_at ();

comment on table public.competitor_alerts is 'Persistent competitor alert feed; deduped per user/competitor/event.';
comment on table public.alert_rules is 'User alert preferences: enabled types, email, thresholds, optional competitor scope.';

notify pgrst, 'reload schema';
