-- Owners can fully remove team memberships so the same email can be re-invited later.

drop policy if exists "team_memberships_owner_delete" on public.team_memberships;
create policy "team_memberships_owner_delete"
  on public.team_memberships for delete
  using (auth.uid() = owner_user_id);
