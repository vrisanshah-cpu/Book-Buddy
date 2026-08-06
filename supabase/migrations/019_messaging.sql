-- Phase G: student/parent/teacher messaging. Direct (2-party) conversations
-- only, never kid-to-kid — enforced by create_conversation() below, which
-- is the ONLY way a conversation or its participant rows get created
-- (there is deliberately no insert policy on conversations /
-- conversation_participants, so this rule can't be bypassed from the
-- client). Messages are read via RLS directly; marking them read goes
-- through mark_messages_read() so participants can't otherwise UPDATE
-- (and tamper with) message rows.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role_in_conversation text not null check (role_in_conversation in ('kid', 'parent', 'teacher')),
  unique (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_by uuid[] not null default '{}'
);

create index if not exists conversation_participants_conversation_id_idx on public.conversation_participants (conversation_id);
create index if not exists conversation_participants_user_id_idx on public.conversation_participants (user_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

-- Standard "chat room membership" RLS self-join: terminates via the
-- user_id = auth.uid() base case, so it doesn't recurse indefinitely.
drop policy if exists "conversation_participants_select" on public.conversation_participants;
create policy "conversation_participants_select" on public.conversation_participants for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_participants.conversation_id
        and cp2.user_id = auth.uid()
    )
  );

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

-- Finds (or the caller creates) a direct conversation between exactly two
-- people, refusing kid-to-kid pairs. p_participant_ids must contain the
-- caller.
create or replace function public.create_conversation(p_participant_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_has_adult boolean;
  v_caller_included boolean;
  v_other uuid;
begin
  if array_length(p_participant_ids, 1) is distinct from 2 then
    raise exception 'A direct conversation needs exactly 2 participants';
  end if;

  select exists (select 1 from unnest(p_participant_ids) pid where pid = auth.uid())
    into v_caller_included;
  if not v_caller_included then
    raise exception 'You must be one of the participants';
  end if;

  select exists (
    select 1 from public.users u
    where u.id = any(p_participant_ids) and u.role in ('parent', 'teacher')
  ) into v_has_adult;
  if not v_has_adult then
    raise exception 'A conversation needs at least one parent or teacher';
  end if;

  select p.conversation_id into v_conversation_id
  from public.conversation_participants p
  where p.user_id = p_participant_ids[1]
    and exists (
      select 1 from public.conversation_participants p2
      where p2.conversation_id = p.conversation_id and p2.user_id = p_participant_ids[2]
    )
    and (select count(*) from public.conversation_participants p3 where p3.conversation_id = p.conversation_id) = 2
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations default values returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role_in_conversation)
  select v_conversation_id, u.id, u.role
  from public.users u
  where u.id = any(p_participant_ids);

  return v_conversation_id;
end;
$$;

grant execute on function public.create_conversation(uuid[]) to authenticated;

create or replace function public.mark_messages_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = auth.uid()
  ) then
    raise exception 'Not a participant in this conversation';
  end if;

  update public.messages
  set read_by = array_append(read_by, auth.uid())
  where conversation_id = p_conversation_id
    and not (auth.uid() = any(read_by));
end;
$$;

grant execute on function public.mark_messages_read(uuid) to authenticated;
