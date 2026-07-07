-- Consecutive daily app usage streak (UTC calendar days) for free-user scrape gating.

alter table public.profiles
  add column if not exists last_active_date date,
  add column if not exists app_streak_days integer not null default 0;

comment on column public.profiles.last_active_date is
  'Last UTC calendar day the user opened the dashboard (used for consecutive-day streak).';

comment on column public.profiles.app_streak_days is
  'Consecutive UTC days with at least one dashboard visit; resets when a day is missed.';

create or replace function public.record_user_daily_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_last date;
  v_streak integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not allowed';
  end if;

  select last_active_date, app_streak_days
  into v_last, v_streak
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if v_last = v_today then
    return;
  end if;

  if v_last = v_today - 1 then
    update public.profiles
    set
      last_active_date = v_today,
      app_streak_days = v_streak + 1,
      updated_at = now()
    where id = p_user_id;
  else
    update public.profiles
    set
      last_active_date = v_today,
      app_streak_days = 1,
      updated_at = now()
    where id = p_user_id;
  end if;
end;
$$;

revoke all on function public.record_user_daily_activity(uuid) from public;
grant execute on function public.record_user_daily_activity(uuid) to authenticated;
