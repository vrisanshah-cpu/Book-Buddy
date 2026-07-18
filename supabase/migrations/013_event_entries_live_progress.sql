-- Allows a kid to upsert their own live progress row while a weekend event
-- is active, via app/api/reading/log/route.ts calling
-- syncActiveEventProgress() (lib/weekend-events.ts) right when a book is
-- marked finished. Previously event_entries was only ever written by
-- close-weekend-event's service-role admin client (which bypasses RLS
-- entirely), so this doesn't conflict with that -- rank is still only ever
-- assigned there, never by the live-progress path.

drop policy if exists "event_entries_upsert_own" on public.event_entries;
create policy "event_entries_upsert_own" on public.event_entries for insert
  with check (user_id = auth.uid());

drop policy if exists "event_entries_update_own" on public.event_entries;
create policy "event_entries_update_own" on public.event_entries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
