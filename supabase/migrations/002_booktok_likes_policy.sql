-- Run if likes fail to update on BookTok posts
create policy "booktok_posts_update_likes" on public.booktok_posts
  for update to authenticated
  using (true)
  with check (true);

-- Teachers can delete posts in clubs they created
create policy "book_club_posts_teacher_delete" on public.book_club_posts
  for delete using (
    exists (
      select 1 from public.book_clubs bc
      where bc.id = book_club_posts.club_id and bc.created_by = auth.uid()
    )
  );
