-- Lets a completed challenge grant a title too, not just an event
-- (user_titles already tracked source_event_id from 012; this adds the
-- equivalent for challenges so a title can be traced back to whichever
-- earned it).
alter table public.user_titles
  add column if not exists source_challenge_id uuid references public.challenges(id) on delete set null;
