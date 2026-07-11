-- Allow teachers to add books to a student's shelf (book list assignment)
create policy "user_books_teacher_write" on public.user_books for insert
  with check (public.is_teacher_of(user_id));
create policy "user_books_teacher_update" on public.user_books for update
  using (public.is_teacher_of(user_id));