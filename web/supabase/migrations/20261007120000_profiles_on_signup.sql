-- Every new auth user gets a profile row at signup. The app only created one in the auth callback, so people who
-- signed up but never finished the email link had none: invisible in /admin and impossible to quote.
-- profiles_email_from_auth (20261006120000) fills email from auth.users on insert.

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row
  execute function public.create_profile_for_new_user();

-- Existing accounts without a profile are intentionally left as they are (no backfill).
