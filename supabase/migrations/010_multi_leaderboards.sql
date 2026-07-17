alter table public.users add column if not exists leaderboard_nickname text;
alter table public.users add column if not exists leaderboard_opt_in boolean not null default false;

-- Classroom leaderboard: 3 metrics at once, real names (classmates already know each other)
create or replace function public.get_classroom_leaderboard_v2(p_classroom_id uuid)
returns table (
  student_id uuid,
  display_name text,
  avatar_url text,
  minutes_read bigint,
  books_finished bigint,
  booktok_posts bigint
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.display_name,
    u.avatar_url,
    coalesce(rs.total_minutes, 0),
    coalesce(ub.total_finished, 0),
    coalesce(bt.total_posts, 0)
  from public.users u
  join public.teacher_student ts on ts.student_id = u.id
  left join (
    select user_id, sum(minutes_read) as total_minutes
    from public.reading_sessions group by user_id
  ) rs on rs.user_id = u.id
  left join (
    select user_id, count(*) as total_finished
    from public.user_books where status = 'finished' group by user_id
  ) ub on ub.user_id = u.id
  left join (
    select user_id, count(*) as total_posts
    from public.booktok_posts group by user_id
  ) bt on bt.user_id = u.id
  where ts.classroom_id = p_classroom_id
    and exists (
      select 1 from public.teacher_student me
      where me.classroom_id = p_classroom_id and me.student_id = auth.uid()
    );
$$;

grant execute on function public.get_classroom_leaderboard_v2(uuid) to authenticated;

-- Global leaderboard: only opted-in kids, chosen nickname only, never real name
create or replace function public.get_global_leaderboard()
returns table (
  student_id uuid,
  display_name text,
  avatar_url text,
  minutes_read bigint,
  books_finished bigint,
  booktok_posts bigint
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    coalesce(u.leaderboard_nickname, 'Reader'),
    u.avatar_url,
    coalesce(rs.total_minutes, 0),
    coalesce(ub.total_finished, 0),
    coalesce(bt.total_posts, 0)
  from public.users u
  left join (
    select user_id, sum(minutes_read) as total_minutes
    from public.reading_sessions group by user_id
  ) rs on rs.user_id = u.id
  left join (
    select user_id, count(*) as total_finished
    from public.user_books where status = 'finished' group by user_id
  ) ub on ub.user_id = u.id
  left join (
    select user_id, count(*) as total_posts
    from public.booktok_posts group by user_id
  ) bt on bt.user_id = u.id
  where u.role = 'kid' and u.leaderboard_opt_in = true;
$$;

grant execute on function public.get_global_leaderboard() to authenticated;