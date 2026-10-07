-- profiles.email mirrors the Supabase Auth sign-in email. Users can update their own profile row
-- (RLS "Users manage their own profile"), so without this they could set any address here.
-- Nothing may treat profiles.email as proof of identity; this keeps it honest for display and notifications.

create or replace function public.profiles_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.email := (select u.email from auth.users u where u.id = new.id);
  return new;
end;
$$;

revoke all on function public.profiles_email_from_auth() from public, anon, authenticated;

drop trigger if exists profiles_email_from_auth on public.profiles;
create trigger profiles_email_from_auth
  before insert or update of email on public.profiles
  for each row
  execute function public.profiles_email_from_auth();

-- Repair any row that already drifted from its auth email.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;
