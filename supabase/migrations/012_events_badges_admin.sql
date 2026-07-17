-- Weekend reading contests, badges/titles, and admin controls (two-tier
-- featured books + admin blog/video posts). Schema only, no auto-run.
--
-- NOTE ON NUMBERING: an earlier plan called this "011", but 011 in this repo
-- is already 011_dedupe_global_challenges.sql. This is 012.

-- =============================================================================
-- WEEKEND EVENTS, BADGES, TITLES
-- =============================================================================

create table if not exists public.weekend_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  goal_type text not null check (goal_type in ('books_count', 'genre_diversity', 'author_prefix', 'topic')),
  goal_config jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'closed'))
);

create table if not exists public.event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.weekend_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  progress int not null default 0,
  qualifying_book_ids uuid[] not null default '{}',
  rank int,
  unique (event_id, user_id)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'legendary'))
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  source_event_id uuid references public.weekend_events(id) on delete set null,
  unique (user_id, badge_id, source_event_id)
);

create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'legendary'))
);

create table if not exists public.user_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  earned_at timestamptz not null default now(),
  source_event_id uuid references public.weekend_events(id) on delete set null,
  unique (user_id, title_id, source_event_id)
);

-- Lets a kid choose which earned title shows next to their name. Added after
-- `titles` exists so the FK is valid.
alter table public.users add column if not exists equipped_title_id uuid references public.titles(id) on delete set null;

-- =============================================================================
-- ADMIN ROLE (boolean flag layered on the existing kid/parent/teacher role —
-- deliberately NOT a 4th value of users.role, since that has a check
-- constraint and middleware.ts does an exhaustive role-based redirect keyed
-- off ROLE_HOME. No signup path: flip this manually in Table Editor.)
-- =============================================================================

alter table public.users add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- =============================================================================
-- TWO-TIER FEATURED BOOKS
-- =============================================================================

-- Global, admin-only, shown to every kid + the logged-out landing page.
-- The OLD `books.featured` column (005) and its `books_teacher_feature`
-- policy are left untouched but should no longer be read/written by new code.
alter table public.books add column if not exists admin_featured boolean not null default false;

-- Per-classroom featured lists, so teachers stop overwriting each other's
-- picks on the old shared `books.featured` column.
create table if not exists public.classroom_featured_books (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  featured_by uuid references public.users(id) on delete set null,
  featured_at timestamptz not null default now(),
  primary key (classroom_id, book_id)
);

-- =============================================================================
-- ADMIN BLOG/VIDEO POSTS (schema only — no app code consumes this yet,
-- see the "not built yet" note in chat)
-- =============================================================================

create table if not exists public.admin_posts (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id) on delete set null,
  type text not null check (type in ('blog', 'video')),
  title text not null,
  body text,
  video_url text,
  cover_image_url text,
  pinned boolean not null default false,
  published_at timestamptz not null default now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_weekend_events_status on public.weekend_events(status);
create index if not exists idx_event_entries_event on public.event_entries(event_id);
create index if not exists idx_user_badges_user on public.user_badges(user_id);
create index if not exists idx_user_titles_user on public.user_titles(user_id);
create index if not exists idx_classroom_featured_books_classroom on public.classroom_featured_books(classroom_id);
create index if not exists idx_admin_posts_pinned on public.admin_posts(pinned, published_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.weekend_events enable row level security;
alter table public.event_entries enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.titles enable row level security;
alter table public.user_titles enable row level security;
alter table public.classroom_featured_books enable row level security;
alter table public.admin_posts enable row level security;

-- weekend_events / badges / titles: public catalog data, readable by anyone
-- logged in. No insert/update/delete policies on purpose — only the
-- service-role admin client (cron routes) can write these.
drop policy if exists "weekend_events_select" on public.weekend_events;
create policy "weekend_events_select" on public.weekend_events for select to authenticated using (true);

drop policy if exists "badges_select" on public.badges;
create policy "badges_select" on public.badges for select to authenticated using (true);

drop policy if exists "titles_select" on public.titles;
create policy "titles_select" on public.titles for select to authenticated using (true);

-- event_entries: a kid can read their own row directly (for the progress bar
-- on /kids/events). Full cross-user leaderboards go through
-- get_event_leaderboard() below, which anonymizes non-opted-in kids the same
-- way get_global_leaderboard() already does -- raw joins to `users` don't
-- work here since users_select_own only allows seeing your own row.
drop policy if exists "event_entries_select_own" on public.event_entries;
create policy "event_entries_select_own" on public.event_entries for select using (user_id = auth.uid());

drop policy if exists "user_badges_select_own" on public.user_badges;
create policy "user_badges_select_own" on public.user_badges for select using (user_id = auth.uid());

drop policy if exists "user_titles_select_own" on public.user_titles;
create policy "user_titles_select_own" on public.user_titles for select using (user_id = auth.uid());

-- Privacy-safe cross-user leaderboard for one event's results page. Reuses
-- the same nickname/opt-in convention as get_global_leaderboard() (010)
-- since weekend events are platform-wide, not classroom-scoped.
create or replace function public.get_event_leaderboard(p_event_id uuid)
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
    case when u.leaderboard_opt_in then coalesce(u.leaderboard_nickname, 'Reader') else 'Reader' end,
    case when u.leaderboard_opt_in then u.avatar_url else null end,
    ee.progress,
    ee.rank,
    ee.user_id = auth.uid()
  from public.event_entries ee
  join public.users u on u.id = ee.user_id
  where ee.event_id = p_event_id
  order by ee.rank asc nulls last, ee.progress desc;
$$;

grant execute on function public.get_event_leaderboard(uuid) to authenticated;

-- books.admin_featured: admin-only write. Additive to the existing
-- books_teacher_feature policy from 005 -- not replacing it.
drop policy if exists "books_admin_feature" on public.books;
create policy "books_admin_feature" on public.books for update
  using (public.is_admin())
  with check (public.is_admin());

-- classroom_featured_books: teachers manage their own classroom's rows only.
drop policy if exists "classroom_featured_books_teacher_manage" on public.classroom_featured_books;
create policy "classroom_featured_books_teacher_manage" on public.classroom_featured_books for all
  using (exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()));

drop policy if exists "classroom_featured_books_student_read" on public.classroom_featured_books;
create policy "classroom_featured_books_student_read" on public.classroom_featured_books for select
  using (exists (
    select 1 from public.teacher_student ts
    where ts.classroom_id = classroom_featured_books.classroom_id and ts.student_id = auth.uid()
  ));

-- admin_posts: everyone can read, only admins can write.
drop policy if exists "admin_posts_select" on public.admin_posts;
create policy "admin_posts_select" on public.admin_posts for select to authenticated using (true);

drop policy if exists "admin_posts_admin_write" on public.admin_posts;
create policy "admin_posts_admin_write" on public.admin_posts for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- SEED CATALOG DATA
-- =============================================================================

insert into public.badges (code, name, description, icon, rarity) values
  ('event_finisher', 'Weekend Finisher', 'Completed a weekend reading contest goal.', '🎯', 'common'),
  ('event_top3', 'Podium Finish', 'Placed in the top 3 of a weekend reading contest.', '🥉', 'rare'),
  ('event_champion', 'Weekend Champion', 'Won first place in a weekend reading contest.', '👑', 'legendary')
on conflict (code) do nothing;

insert into public.titles (code, name, rarity) values
  ('finisher', 'Finisher', 'common'),
  ('podium', 'Podium', 'rare'),
  ('champion', 'Champion', 'legendary')
on conflict (code) do nothing;