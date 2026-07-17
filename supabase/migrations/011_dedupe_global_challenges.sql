-- Fixes duplicate challenge cards (e.g. two "Book Explorer" entries).
--
-- Root cause: 001_initial_schema.sql seeds three global challenges with a
-- plain `on conflict do nothing`, but that clause has no conflict target and
-- at the time 001 runs there is no unique constraint on `challenges.title`
-- either -- so it never actually suppressed anything. Every time that insert
-- statement ran again against an existing database, it created brand new
-- duplicate rows (new id, same title) for "7-Day Reading Streak",
-- "Book Explorer", and "Reading Marathon". 008_seed_default_challenges.sql
-- later added a unique index, but only for rows flagged is_default = true --
-- which 001's rows never were, so it didn't cover them.
--
-- enrollInAvailableChallenges() (lib/challenges.ts) enrolls a student in
-- every un-enrolled global challenge id, so once duplicate challenge rows
-- existed, students got auto-enrolled in both, producing the repeated cards.
--
-- Note: this avoids a temporary table on purpose. Some SQL clients (e.g. the
-- Supabase dashboard's SQL editor) run a multi-statement script over pooled
-- connections, and a TEMP table only lives for one session -- so a later
-- statement in the same script can fail with "relation ... does not exist".
-- Each step below recomputes the dupe/keep mapping inline instead.

-- 1) Move any student progress on a duplicate row onto the row we're keeping
--    (the oldest id per title, among global challenges), skipping cases where
--    the student is already enrolled in both, to avoid violating the
--    unique(user_id, challenge_id) constraint.
with dedupe_map as (
  select
    c.id as dupe_id,
    (array_agg(c.id) over (partition by c.title order by c.id))[1] as keep_id
  from public.challenges c
  where c.classroom_id is null and c.personalized_for is null
)
update public.user_challenges uc
set challenge_id = m.keep_id
from dedupe_map m
where uc.challenge_id = m.dupe_id
  and m.dupe_id <> m.keep_id
  and not exists (
    select 1 from public.user_challenges uc2
    where uc2.user_id = uc.user_id and uc2.challenge_id = m.keep_id
  );

-- 2) Drop any leftover enrollment rows still pointing at a duplicate (the
--    cases skipped above, where the student already had the kept challenge).
with dedupe_map as (
  select
    c.id as dupe_id,
    (array_agg(c.id) over (partition by c.title order by c.id))[1] as keep_id
  from public.challenges c
  where c.classroom_id is null and c.personalized_for is null
)
delete from public.user_challenges uc
using dedupe_map m
where uc.challenge_id = m.dupe_id
  and m.dupe_id <> m.keep_id;

-- 3) Remove the now-unreferenced duplicate challenge rows.
with dedupe_map as (
  select
    c.id as dupe_id,
    (array_agg(c.id) over (partition by c.title order by c.id))[1] as keep_id
  from public.challenges c
  where c.classroom_id is null and c.personalized_for is null
)
delete from public.challenges c
using dedupe_map m
where c.id = m.dupe_id
  and m.dupe_id <> m.keep_id;

-- 4) Prevent this from ever happening again: one row per title across ALL
--    global challenges, regardless of the is_default flag (superseding the
--    narrower partial index from 008, which missed 001's un-flagged rows).
drop index if exists public.challenges_title_default_unique;
create unique index if not exists challenges_title_global_unique
  on public.challenges (title)
  where classroom_id is null and personalized_for is null;