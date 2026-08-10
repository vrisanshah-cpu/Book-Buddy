-- Fix: infinite recursion (Postgres 42P17) in the messaging RLS policies
-- from 019_messaging.sql. conversation_participants_select queried
-- conversation_participants from inside its own USING clause, assuming the
-- "user_id = auth.uid()" base case would short-circuit it — it doesn't.
-- Postgres re-applies a table's RLS policy to every access of that table,
-- including from within its own policy's subquery, so this recurses
-- forever and throws:
--   infinite recursion detected in policy for relation "conversation_participants"
-- That in turn broke conversations_select / messages_select / messages_insert
-- too, since they all query conversation_participants internally.
--
-- Fix: a SECURITY DEFINER helper function bypasses RLS for its own internal
-- query, so calling it from a policy — instead of querying the table
-- directly — breaks the recursion.

create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = p_user_id
  );
$$;

grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations for select
  using (public.is_conversation_participant(id, auth.uid()));

drop policy if exists "conversation_participants_select" on public.conversation_participants;
create policy "conversation_participants_select" on public.conversation_participants for select
  using (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id, auth.uid())
  );

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
  );