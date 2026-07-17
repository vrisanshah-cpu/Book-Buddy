-- Record the teacher-challenge-assignment permission that was already applied
-- directly in Supabase, so a fresh database rebuild from these migration files
-- doesn't lose it.
drop policy if exists "user_challenges_teacher_assign" on public.user_challenges;
create policy "user_challenges_teacher_assign" on public.user_challenges for insert
  with check (public.is_teacher_of(user_id));

-- Tighten BookTok likes: the old policy let any logged-in user rewrite an
-- entire post (not just the like count). Replace it with a function that can
-- only ever adjust the likes number, nothing else.
drop policy if exists "booktok_posts_update_likes" on public.booktok_posts;

create or replace function public.adjust_booktok_likes(p_post_id uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.booktok_posts
  set likes = greatest(0, likes + p_delta)
  where id = p_post_id;
end;
$$;

grant execute on function public.adjust_booktok_likes(uuid, int) to authenticated;