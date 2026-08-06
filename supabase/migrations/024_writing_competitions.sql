-- Phase M: bi-monthly writing competitions. AI feedback (on submit) and
-- comment moderation (on post) both happen server-side BEFORE the insert
-- — see app/api/competitions/[id]/submit and .../comment — so neither
-- writing_submissions nor submission_comments needs a client-facing
-- update policy at all.

create table if not exists public.writing_competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  prizes jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'judging', 'completed')),
  created_by uuid not null references public.users(id) on delete cascade
);

create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.writing_competitions(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  ai_feedback text,
  community_votes int not null default 0,
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  unique (competition_id, author_id)
);

create table if not exists public.submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  comment_text text not null,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'rejected', 'pending')),
  created_at timestamptz not null default now()
);

-- Not in the original plan, but community_votes needs *something*
-- stopping a kid from clicking vote 50 times on their favorite — this is
-- the one-row-per-(competition,voter) guard cast_submission_vote() relies
-- on for that.
create table if not exists public.submission_votes (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.writing_competitions(id) on delete cascade,
  submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  voter_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (competition_id, voter_id)
);

create index if not exists writing_submissions_competition_idx on public.writing_submissions (competition_id);
create index if not exists submission_comments_submission_idx on public.submission_comments (submission_id);

alter table public.writing_competitions enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.submission_comments enable row level security;
alter table public.submission_votes enable row level security;

drop policy if exists "writing_competitions_select" on public.writing_competitions;
create policy "writing_competitions_select" on public.writing_competitions for select
  using (status <> 'draft' or public.is_admin());

drop policy if exists "writing_competitions_admin_manage" on public.writing_competitions;
create policy "writing_competitions_admin_manage" on public.writing_competitions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "writing_submissions_select" on public.writing_submissions;
create policy "writing_submissions_select" on public.writing_submissions for select
  using (
    exists (select 1 from public.writing_competitions wc where wc.id = competition_id and wc.status <> 'draft')
    or public.is_admin()
  );

drop policy if exists "writing_submissions_insert_own" on public.writing_submissions;
create policy "writing_submissions_insert_own" on public.writing_submissions for insert
  with check (author_id = auth.uid());

drop policy if exists "writing_submissions_admin_update" on public.writing_submissions;
create policy "writing_submissions_admin_update" on public.writing_submissions for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "submission_comments_select" on public.submission_comments;
create policy "submission_comments_select" on public.submission_comments for select
  using (moderation_status = 'approved' or author_id = auth.uid() or public.is_admin());

drop policy if exists "submission_comments_insert_own" on public.submission_comments;
create policy "submission_comments_insert_own" on public.submission_comments for insert
  with check (author_id = auth.uid());

drop policy if exists "submission_votes_select_own" on public.submission_votes;
create policy "submission_votes_select_own" on public.submission_votes for select
  using (voter_id = auth.uid());

-- No insert policy on submission_votes: only cast_submission_vote() (a
-- SECURITY DEFINER function, so it runs with elevated privileges
-- regardless of caller) ever writes to it.
create or replace function public.cast_submission_vote(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competition_id uuid;
  v_author_id uuid;
begin
  select competition_id, author_id into v_competition_id, v_author_id
  from public.writing_submissions where id = p_submission_id;

  if v_competition_id is null then
    raise exception 'Submission not found';
  end if;
  if v_author_id = auth.uid() then
    raise exception 'You can''t vote for your own story';
  end if;

  insert into public.submission_votes (competition_id, submission_id, voter_id)
  values (v_competition_id, p_submission_id, auth.uid());

  update public.writing_submissions
  set community_votes = community_votes + 1
  where id = p_submission_id;
end;
$$;

grant execute on function public.cast_submission_vote(uuid) to authenticated;
