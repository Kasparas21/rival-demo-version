-- Grant admin dashboard access to margentura@gmail.com (idempotent).

insert into public.admin_users (user_id, email, role)
select u.id, lower(trim(u.email)), 'admin'
from auth.users u
where lower(trim(u.email)) = lower(trim('margentura@gmail.com'))
on conflict (user_id) do update set
  email = excluded.email,
  role = 'admin';
