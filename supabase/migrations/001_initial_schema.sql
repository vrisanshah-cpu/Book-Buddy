-- Book Buddy — run this in Supabase SQL Editor (Dashboard → SQL → New query)

-- =============================================================================
-- TABLES
-- =============================================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null check (role in ('kid', 'parent', 'teacher')),
  display_name text not null default 'Reader',
  username text unique,
  avatar_url text,
  age int,
  xp int not null default 0,
  school_name text,
  grade_levels text,
  created_at timestamptz not null default now()
);

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  join_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.parent_child (
  parent_id uuid not null references public.users(id) on delete cascade,
  child_id uuid not null references public.users(id) on delete cascade,
  primary key (parent_id, child_id)
);

create table if not exists public.teacher_student (
  teacher_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  classroom_id uuid references public.classrooms(id) on delete cascade,
  classroom_name text,
  primary key (teacher_id, student_id, classroom_id)
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  cover_url text,
  description text,
  age_min int,
  age_max int,
  genre text,
  added_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status text not null check (status in ('reading', 'finished', 'want_to_read')),
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  started_at timestamptz,
  finished_at timestamptz,
  unique (user_id, book_id)
);

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  minutes_read int not null default 0,
  pages_read int not null default 0,
  date date not null default current_date
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('reading_streak', 'books_finished', 'minutes_read', 'quiz_score')),
  target_value int not null,
  badge_icon text default '🏆',
  created_by uuid references public.users(id) on delete set null,
  classroom_id uuid references public.classrooms(id) on delete cascade,
  start_date date,
  end_date date
);

create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

create table if not exists public.pip_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  book_context uuid references public.books(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.book_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  current_book_id uuid references public.books(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.book_club_members (
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.book_club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.booktok_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  content text not null,
  likes int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.booktok_likes (
  post_id uuid not null references public.booktok_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists public.reading_game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  score int not null,
  questions_correct int not null,
  questions_total int not null,
  played_at timestamptz not null default now()
);

create table if not exists public.book_lists (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  classroom_id uuid references public.classrooms(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.book_list_items (
  list_id uuid not null references public.book_lists(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  primary key (list_id, book_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_user_books_user on public.user_books(user_id);
create index if not exists idx_reading_sessions_user_date on public.reading_sessions(user_id, date desc);
create index if not exists idx_pip_messages_user on public.pip_messages(user_id, created_at desc);
create index if not exists idx_parent_child_parent on public.parent_child(parent_id);
create index if not exists idx_teacher_student_teacher on public.teacher_student(teacher_id);

-- =============================================================================
-- HELPER FUNCTIONS (RLS)
-- =============================================================================

create or replace function public.is_parent_of(child_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.parent_child
    where parent_id = auth.uid() and child_id = is_parent_of.child_id
  );
$$;

create or replace function public.is_teacher_of(student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_student
    where teacher_id = auth.uid() and student_id = is_teacher_of.student_id
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, display_name, username, school_name, grade_levels)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'kid'),
    coalesce(new.raw_user_meta_data->>'display_name', 'Reader'),
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'school_name',
    new.raw_user_meta_data->>'grade_levels'
  )
  on conflict (id) do update set
    role = excluded.role,
    display_name = excluded.display_name,
    username = excluded.username,
    school_name = excluded.school_name,
    grade_levels = excluded.grade_levels;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.users enable row level security;
alter table public.classrooms enable row level security;
alter table public.parent_child enable row level security;
alter table public.teacher_student enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenges enable row level security;
alter table public.pip_messages enable row level security;
alter table public.book_clubs enable row level security;
alter table public.book_club_members enable row level security;
alter table public.book_club_posts enable row level security;
alter table public.booktok_posts enable row level security;
alter table public.booktok_likes enable row level security;
alter table public.reading_game_scores enable row level security;
alter table public.book_lists enable row level security;
alter table public.book_list_items enable row level security;

-- users
create policy "users_select_own" on public.users for select using (id = auth.uid());
create policy "users_select_parent_children" on public.users for select using (public.is_parent_of(id));
create policy "users_select_teacher_students" on public.users for select using (public.is_teacher_of(id));
create policy "users_update_own" on public.users for update using (id = auth.uid());

-- parent_child
create policy "parent_child_select" on public.parent_child for select
  using (parent_id = auth.uid() or child_id = auth.uid());
create policy "parent_child_insert" on public.parent_child for insert
  with check (parent_id = auth.uid());

-- teacher_student
create policy "teacher_student_select" on public.teacher_student for select
  using (teacher_id = auth.uid() or student_id = auth.uid());
create policy "teacher_student_manage" on public.teacher_student for all
  using (teacher_id = auth.uid());

-- classrooms
create policy "classrooms_teacher" on public.classrooms for all
  using (teacher_id = auth.uid());
create policy "classrooms_student_read" on public.classrooms for select
  using (exists (
    select 1 from public.teacher_student ts
    where ts.classroom_id = classrooms.id and ts.student_id = auth.uid()
  ));

-- books (readable by all authenticated users)
create policy "books_select" on public.books for select to authenticated using (true);
create policy "books_insert" on public.books for insert to authenticated with check (added_by = auth.uid());

-- user_books
create policy "user_books_own" on public.user_books for all using (user_id = auth.uid());
create policy "user_books_parent_read" on public.user_books for select using (public.is_parent_of(user_id));
create policy "user_books_parent_write" on public.user_books for insert with check (public.is_parent_of(user_id));
create policy "user_books_parent_update" on public.user_books for update using (public.is_parent_of(user_id));
create policy "user_books_teacher_read" on public.user_books for select using (public.is_teacher_of(user_id));

-- reading_sessions
create policy "reading_sessions_own" on public.reading_sessions for all using (user_id = auth.uid());
create policy "reading_sessions_parent_read" on public.reading_sessions for select using (public.is_parent_of(user_id));
create policy "reading_sessions_teacher_read" on public.reading_sessions for select using (public.is_teacher_of(user_id));

-- challenges (read global + classroom)
create policy "challenges_select" on public.challenges for select to authenticated using (
  classroom_id is null
  or exists (
    select 1 from public.teacher_student ts
    where ts.classroom_id = challenges.classroom_id and ts.student_id = auth.uid()
  )
  or created_by = auth.uid()
);
create policy "challenges_teacher_manage" on public.challenges for all
  using (created_by = auth.uid() and public.current_user_role() = 'teacher');

-- user_challenges
create policy "user_challenges_own" on public.user_challenges for all using (user_id = auth.uid());
create policy "user_challenges_parent_read" on public.user_challenges for select using (public.is_parent_of(user_id));
create policy "user_challenges_teacher_read" on public.user_challenges for select using (public.is_teacher_of(user_id));

-- pip_messages (kids only write own; teachers get summarized access via app, not raw RLS)
create policy "pip_messages_own" on public.pip_messages for all using (user_id = auth.uid());
create policy "pip_messages_parent_read" on public.pip_messages for select using (public.is_parent_of(user_id));

-- book clubs & members & posts
create policy "book_clubs_select" on public.book_clubs for select to authenticated using (true);
create policy "book_clubs_insert" on public.book_clubs for insert to authenticated with check (created_by = auth.uid());
create policy "book_clubs_update" on public.book_clubs for update using (created_by = auth.uid());

create policy "book_club_members_select" on public.book_club_members for select to authenticated using (true);
create policy "book_club_members_insert" on public.book_club_members for insert with check (user_id = auth.uid());
create policy "book_club_members_delete" on public.book_club_members for delete using (user_id = auth.uid());

create policy "book_club_posts_select" on public.book_club_posts for select to authenticated using (true);
create policy "book_club_posts_insert" on public.book_club_posts for insert with check (user_id = auth.uid());
create policy "book_club_posts_delete_own" on public.book_club_posts for delete using (user_id = auth.uid());

-- booktok
create policy "booktok_posts_select" on public.booktok_posts for select to authenticated using (true);
create policy "booktok_posts_insert" on public.booktok_posts for insert with check (user_id = auth.uid());
create policy "booktok_likes_all" on public.booktok_likes for all using (user_id = auth.uid());

-- reading game scores
create policy "reading_game_scores_own" on public.reading_game_scores for all using (user_id = auth.uid());
create policy "reading_game_scores_teacher_read" on public.reading_game_scores for select using (public.is_teacher_of(user_id));

-- book lists
create policy "book_lists_teacher" on public.book_lists for all using (teacher_id = auth.uid());
create policy "book_list_items_teacher" on public.book_list_items for all
  using (exists (select 1 from public.book_lists bl where bl.id = list_id and bl.teacher_id = auth.uid()));

-- =============================================================================
-- SEED GLOBAL CHALLENGES (optional)
-- =============================================================================

insert into public.challenges (title, description, type, target_value, badge_icon, start_date, end_date)
values
  ('7-Day Reading Streak', 'Read every day for a week!', 'reading_streak', 7, '🔥', current_date, current_date + 30),
  ('Book Explorer', 'Finish 3 books this month', 'books_finished', 3, '📚', current_date, current_date + 30),
  ('Reading Marathon', 'Read for 300 minutes', 'minutes_read', 300, '⏱️', current_date, current_date + 30)
on conflict do nothing;
