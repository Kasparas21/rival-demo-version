-- Seed default admin users by email (idempotent).

insert into public.admin_users (user_id, email, role)
select u.id, lower(trim(u.email)), 'admin'
from auth.users u
where lower(trim(u.email)) in (
  lower(trim('attributo@yahoo.com')),
  lower(trim('freecardsbf2@gmail.com'))
)
on conflict (user_id) do update set
  email = excluded.email,
  role = 'admin';
