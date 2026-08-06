-- Parent dashboard overhaul needs to show each child's weekend-event
-- placements and earned badges, but those tables only ever had a
-- select-own policy (auth.uid() = user_id) -- a parent querying their
-- child's event_entries or user_badges got zero rows back, silently,
-- not an error. Same is_parent_of() pattern already used for
-- reading_sessions/user_books/user_challenges.

drop policy if exists "event_entries_parent_read" on public.event_entries;
create policy "event_entries_parent_read" on public.event_entries for select
  using (public.is_parent_of(user_id));

drop policy if exists "user_badges_parent_read" on public.user_badges;
create policy "user_badges_parent_read" on public.user_badges for select
  using (public.is_parent_of(user_id));
