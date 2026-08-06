-- Phase I: buddy reading — 2-person co-op challenges between classmates.
-- An invite carries the full proposal; accepting it atomically creates
-- the buddy_challenges + buddy_pairs rows (accept_buddy_invite below),
-- since that write spans both kids and can't happen under the invitee's
-- own RLS alone. Combined progress needs to read BOTH kids' reading data,
-- which a kid's own session can never do (no such RLS policy exists, by
-- design) — so it's synced with the admin client from
-- lib/challenges.ts (syncBuddyProgressForKid), not client-side.

create table if not exists public.buddy_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  goal_type text not null check (goal_type in ('books_count', 'minutes_read')),
  target int not null check (target > 0),
  status text not null default 'active' check (status in ('active', 'completed', 'expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null
);

create table if not exists public.buddy_pairs (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.buddy_challenges(id) on delete cascade,
  kid_a_id uuid not null references public.users(id) on delete cascade,
  kid_b_id uuid not null references public.users(id) on delete cascade,
  combined_progress int not null default 0,
  completed_at timestamptz,
  constraint buddy_pairs_distinct_kids check (kid_a_id <> kid_b_id),
  unique (challenge_id)
);

create table if not exists public.buddy_invites (
  id uuid primary key default gen_random_uuid(),
  from_kid_id uuid not null references public.users(id) on delete cascade,
  to_kid_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  goal_type text not null check (goal_type in ('books_count', 'minutes_read')),
  target int not null check (target > 0),
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  resulting_challenge_id uuid references public.buddy_challenges(id),
  created_at timestamptz not null default now(),
  constraint buddy_invites_distinct_kids check (from_kid_id <> to_kid_id)
);

create index if not exists buddy_pairs_kid_a_idx on public.buddy_pairs (kid_a_id);
create index if not exists buddy_pairs_kid_b_idx on public.buddy_pairs (kid_b_id);
create index if not exists buddy_invites_to_kid_idx on public.buddy_invites (to_kid_id);
create index if not exists buddy_invites_from_kid_idx on public.buddy_invites (from_kid_id);

alter table public.buddy_challenges enable row level security;
alter table public.buddy_pairs enable row level security;
alter table public.buddy_invites enable row level security;

drop policy if exists "buddy_challenges_select" on public.buddy_challenges;
create policy "buddy_challenges_select" on public.buddy_challenges for select
  using (
    exists (
      select 1 from public.buddy_pairs bp
      where bp.challenge_id = buddy_challenges.id
        and (bp.kid_a_id = auth.uid() or bp.kid_b_id = auth.uid())
    )
  );

drop policy if exists "buddy_pairs_select" on public.buddy_pairs;
create policy "buddy_pairs_select" on public.buddy_pairs for select
  using (kid_a_id = auth.uid() or kid_b_id = auth.uid());

drop policy if exists "buddy_invites_select" on public.buddy_invites;
create policy "buddy_invites_select" on public.buddy_invites for select
  using (from_kid_id = auth.uid() or to_kid_id = auth.uid());

drop policy if exists "buddy_invites_insert_own" on public.buddy_invites;
create policy "buddy_invites_insert_own" on public.buddy_invites for insert
  with check (from_kid_id = auth.uid());

drop policy if exists "buddy_invites_cancel_own" on public.buddy_invites;
create policy "buddy_invites_cancel_own" on public.buddy_invites for update
  using (from_kid_id = auth.uid() and status = 'pending')
  with check (status = 'cancelled');

drop policy if exists "buddy_invites_decline_own" on public.buddy_invites;
create policy "buddy_invites_decline_own" on public.buddy_invites for update
  using (to_kid_id = auth.uid() and status = 'pending')
  with check (status = 'declined');

-- Accepting goes through this function (not a raw RLS update to
-- 'accepted') because it also has to create the buddy_challenges +
-- buddy_pairs rows in the same transaction.
create or replace function public.accept_buddy_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_challenge_id uuid;
begin
  select * into v_invite from public.buddy_invites where id = p_invite_id for update;

  if v_invite is null then
    raise exception 'Invite not found';
  end if;
  if v_invite.status <> 'pending' then
    raise exception 'This invite is no longer pending';
  end if;
  if v_invite.to_kid_id <> auth.uid() then
    raise exception 'Only the invited kid can accept this';
  end if;

  insert into public.buddy_challenges (title, description, goal_type, target, ends_at)
  values (v_invite.title, v_invite.description, v_invite.goal_type, v_invite.target, v_invite.ends_at)
  returning id into v_challenge_id;

  insert into public.buddy_pairs (challenge_id, kid_a_id, kid_b_id)
  values (v_challenge_id, v_invite.from_kid_id, v_invite.to_kid_id);

  update public.buddy_invites set status = 'accepted', resulting_challenge_id = v_challenge_id where id = p_invite_id;

  return v_challenge_id;
end;
$$;

grant execute on function public.accept_buddy_invite(uuid) to authenticated;
