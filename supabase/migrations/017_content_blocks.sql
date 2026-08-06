-- Phase C: content controls — a parent or teacher can block a specific
-- book, author, or topic keyword for a linked child ('child' scope) or an
-- entire classroom ('classroom' scope). Enforced app-side in
-- lib/content-blocks.ts, used from Discover recommendations/search, the
-- shelf-add endpoint, Pip chat, and the reading-game AI quiz generator.

create table if not exists public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_by uuid not null references public.users(id) on delete cascade,
  scope text not null check (scope in ('child', 'classroom')),
  child_id uuid references public.users(id) on delete cascade,
  classroom_id uuid references public.classrooms(id) on delete cascade,
  block_type text not null check (block_type in ('book', 'author', 'topic_keyword')),
  book_id uuid references public.books(id) on delete cascade,
  author_name text,
  keyword text,
  created_at timestamptz not null default now(),
  constraint content_blocks_scope_target check (
    (scope = 'child' and child_id is not null and classroom_id is null)
    or (scope = 'classroom' and classroom_id is not null and child_id is null)
  ),
  constraint content_blocks_type_payload check (
    (block_type = 'book' and book_id is not null and author_name is null and keyword is null)
    or (block_type = 'author' and author_name is not null and book_id is null and keyword is null)
    or (block_type = 'topic_keyword' and keyword is not null and book_id is null and author_name is null)
  )
);

create index if not exists content_blocks_child_id_idx on public.content_blocks (child_id) where child_id is not null;
create index if not exists content_blocks_classroom_id_idx on public.content_blocks (classroom_id) where classroom_id is not null;
create index if not exists content_blocks_blocked_by_idx on public.content_blocks (blocked_by);

alter table public.content_blocks enable row level security;

-- A parent/teacher sees the blocks they personally created.
drop policy if exists "content_blocks_select_own" on public.content_blocks;
create policy "content_blocks_select_own" on public.content_blocks for select
  using (blocked_by = auth.uid());

-- A kid can see blocks that apply directly to them...
drop policy if exists "content_blocks_select_affected_child" on public.content_blocks;
create policy "content_blocks_select_affected_child" on public.content_blocks for select
  using (scope = 'child' and child_id = auth.uid());

-- ...or to a classroom they're a student in.
drop policy if exists "content_blocks_select_affected_classroom" on public.content_blocks;
create policy "content_blocks_select_affected_classroom" on public.content_blocks for select
  using (
    scope = 'classroom'
    and classroom_id in (
      select ts.classroom_id from public.teacher_student ts
      where ts.student_id = auth.uid() and ts.classroom_id is not null
    )
  );

-- Parents may only create 'child'-scope blocks for children linked to them.
drop policy if exists "content_blocks_parent_insert" on public.content_blocks;
create policy "content_blocks_parent_insert" on public.content_blocks for insert
  with check (
    blocked_by = auth.uid()
    and scope = 'child'
    and public.is_parent_of(child_id)
  );

-- Teachers may only create 'classroom'-scope blocks for classrooms they own.
drop policy if exists "content_blocks_teacher_insert" on public.content_blocks;
create policy "content_blocks_teacher_insert" on public.content_blocks for insert
  with check (
    blocked_by = auth.uid()
    and scope = 'classroom'
    and classroom_id in (select c.id from public.classrooms c where c.teacher_id = auth.uid())
  );

drop policy if exists "content_blocks_delete_own" on public.content_blocks;
create policy "content_blocks_delete_own" on public.content_blocks for delete
  using (blocked_by = auth.uid());
