-- Writing contest advancement stages + AI-formatted reading challenges.
--
-- IMPORTANT: this extends the writing contest system that already exists
-- (migration 024: writing_competitions, writing_submissions,
-- submission_comments, submission_votes) rather than creating a parallel
-- one. It does NOT touch the existing official/community winner flow in
-- app/api/competitions/[id]/judge (is_winner, prizes) — `stage` is an
-- additive admin workflow for showing students where they stand
-- (Participant -> Semifinalist -> Finalist -> Top 3) during judging,
-- independent of which submission(s) end up flagged is_winner.

alter table public.writing_submissions add column if not exists stage text not null default 'participant'
  check (stage in ('participant', 'semifinalist', 'finalist', 'top_3'));
alter table public.writing_submissions add column if not exists score int
  check (score is null or (score between 0 and 100));
alter table public.writing_submissions add column if not exists admin_feedback text;

create index if not exists writing_submissions_stage_idx on public.writing_submissions (stage);

-- No new RLS needed: writing_submissions_admin_update (024) already covers
-- admin writes to any column via is_admin(), and writing_submissions_select
-- (024) already exposes every column — including ai_feedback today — to
-- any authenticated user once the competition isn't in draft. admin_feedback
-- follows that same existing precedent rather than introducing a
-- column-level access model nothing else in this table uses. Revisit if
-- admin_feedback needs to be author-and-admin-only later.

-- Reading competitions reuse the existing `challenges` table (migration
-- 001, extended in 008/009/015) instead of a new reading_competitions
-- table — same reasoning as writing contests: one source of truth.
-- `tagline` is the one new field the AI formatter needs that the table
-- doesn't already have; title/description/badge_icon already exist.
alter table public.challenges add column if not exists tagline text;
