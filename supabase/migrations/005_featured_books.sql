alter table public.books add column if not exists featured boolean not null default false;

drop policy if exists "books_teacher_feature" on public.books;
create policy "books_teacher_feature" on public.books for update
  using (public.current_user_role() = 'teacher')
  with check (public.current_user_role() = 'teacher');