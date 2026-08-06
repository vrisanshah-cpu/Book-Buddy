-- Phase F: teacher-assigned classroom reading events. Same goal-type
-- system as public.weekend_events (migration 012) — goal scoring is
-- reused from lib/weekend-events.ts (scoreEntryForGoal, validateGoalSpec)
-- rather than duplicated. Unlike weekend events these are scoped to one
-- classroom, teacher-created (not Gemini-generated), and closed on-demand
-- (lib/classroom-events.ts) rather than by a scheduled cron — see that
-- file for why.

create table if not exists public.classroom_events (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  goal_type text not null check (goal_type in ('books_count', 'genre_diversity', 'author_prefix', 'topic')),
  goal_config jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'closed'))
);

create table if not exists public.classroom_event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.classroom_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  progress int not null default 0,
  qualifying_book_ids uuid[] not null default '{}',
  rank int,
  unique (event_id, user_id)
);

create index if not exists classroom_events_classroom_id_idx on public.classroom_events (classroom_id);
create index if not exists classroom_event_entries_event_id_idx on public.classroom_event_entries (event_id);

alter table public.classroom_events enable row level security;
alter table public.classroom_event_entries enable row level security;

-- Students in the classroom, and the teacher who made it, can see an event.
drop policy if exists "classroom_events_select" on public.classroom_events;
create policy "classroom_events_select" on public.classroom_events for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.teacher_student ts
      where ts.classroom_id = classroom_events.classroom_id and ts.student_id = auth.uid()
    )
  );

-- Only the owning teacher can create/update/close events for their own classroom.
drop policy if exists "classroom_events_teacher_manage" on public.classroom_events;
create policy "classroom_events_teacher_manage" on public.classroom_events for all
  using (exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()));

drop policy if exists "classroom_event_entries_select_own" on public.classroom_event_entries;
create policy "classroom_event_entries_select_own" on public.classroom_event_entries for select
  using (user_id = auth.uid());

drop policy if exists "classroom_event_entries_upsert_own" on public.classroom_event_entries;
create policy "classroom_event_entries_upsert_own" on public.classroom_event_entries for insert
  with check (user_id = auth.uid());

drop policy if exists "classroom_event_entries_update_own" on public.classroom_event_entries;
create policy "classroom_event_entries_update_own" on public.classroom_event_entries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Real-name leaderboard for one classroom event. Classroom membership is
-- already a closed, teacher-supervised group (unlike platform-wide
-- weekend events), so this doesn't need the nickname/opt-in anonymization
-- that get_event_leaderboard() (migration 012) uses.
create or replace function public.get_classroom_event_leaderboard(p_event_id uuid)
returns table (
  student_id uuid,
  display_name text,
  avatar_url text,
  progress int,
  rank int,
  is_me boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    ee.user_id,
    u.display_name,
    u.avatar_url,
    ee.progress,
    ee.rank,
    ee.user_id = auth.uid()
  from public.classroom_event_entries ee
  join public.classroom_events ce on ce.id = ee.event_id
  join public.users u on u.id = ee.user_id
  where ee.event_id = p_event_id
    and (
      ce.created_by = auth.uid()
      or exists (
        select 1 from public.teacher_student ts
        where ts.classroom_id = ce.classroom_id and ts.student_id = auth.uid()
      )
    )
  order by ee.rank asc nulls last, ee.progress desc;
$$;

grant execute on function public.get_classroom_event_leaderboard(uuid) to authenticated;
