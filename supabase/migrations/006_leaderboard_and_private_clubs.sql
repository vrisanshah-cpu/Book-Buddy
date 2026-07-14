-- Classroom XP leaderboard — a kid can only see this for a classroom they're actually in
create or replace function public.get_classroom_leaderboard(p_classroom_id uuid)
returns table (student_id uuid, display_name text, avatar_url text, xp int)
language sql
security definer
set search_path = public
as $$
  select u.id, u.display_name, u.avatar_url, u.xp
  from public.users u
  join public.teacher_student ts on ts.student_id = u.id
  where ts.classroom_id = p_classroom_id
    and exists (
      select 1 from public.teacher_student me
      where me.classroom_id = p_classroom_id and me.student_id = auth.uid()
    )
  order by u.xp desc
  limit 20;
$$;

grant execute on function public.get_classroom_leaderboard(uuid) to authenticated;

-- Same protected pattern for the reading-game quiz leaderboard (this also
-- fixes a real existing bug: classmates' names were showing as "Reader"
-- because there was never a permission letting a kid see a classmate's name)
create or replace function public.get_quiz_leaderboard(p_classroom_id uuid)
returns table (student_id uuid, display_name text, avatar_url text, best_score int)
language sql
security definer
set search_path = public
as $$
  select u.id, u.display_name, u.avatar_url, max(rgs.score) as best_score
  from public.users u
  join public.teacher_student ts on ts.student_id = u.id
  join public.reading_game_scores rgs on rgs.user_id = u.id
  where ts.classroom_id = p_classroom_id
    and exists (
      select 1 from public.teacher_student me
      where me.classroom_id = p_classroom_id and me.student_id = auth.uid()
    )
  group by u.id, u.display_name, u.avatar_url
  order by best_score desc
  limit 10;
$$;

grant execute on function public.get_quiz_leaderboard(uuid) to authenticated;

-- Invite-only book clubs
alter table public.book_clubs add column if not exists is_private boolean not null default false;
alter table public.book_clubs add column if not exists invite_code text unique;