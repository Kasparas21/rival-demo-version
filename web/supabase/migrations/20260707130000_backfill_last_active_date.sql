-- Backfill last_active_date from auth sign-in / profile touch so inactivity gating works immediately.

update public.profiles p
set last_active_date = sub.candidate
from (
  select
    p2.id,
    greatest(
      coalesce((timezone('utc', u.last_sign_in_at))::date, '-infinity'::date),
      coalesce((timezone('utc', p2.updated_at))::date, '-infinity'::date),
      coalesce((timezone('utc', p2.created_at))::date, '-infinity'::date)
    ) as candidate
  from public.profiles p2
  join auth.users u on u.id = p2.id
  where p2.last_active_date is null
) sub
where p.id = sub.id
  and sub.candidate <> '-infinity'::date;
