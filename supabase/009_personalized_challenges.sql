-- Lets a challenge be generated for, and visible only to, one specific
-- student (an AI-generated personalized challenge), distinct from
-- teacher-created classroom challenges and the shared global defaults.

alter table public.challenges add column if not exists personalized_for uuid references public.users(id) on delete cascade;