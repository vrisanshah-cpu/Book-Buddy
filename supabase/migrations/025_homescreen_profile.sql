-- Phase N: homescreen profile — equipped badge/title + an AI-picked color
-- theme. Not adding a separate equipped_avatar_url column as the original
-- plan sketched: users.avatar_url (migration 001) already serves as the
-- profile picture everywhere else in the app, so equipping one here would
-- just be a second, driftable copy of the same fact.

alter table public.users add column if not exists equipped_badge_id uuid references public.badges(id) on delete set null;
alter table public.users add column if not exists equipped_title_id uuid references public.titles(id) on delete set null;
alter table public.users add column if not exists active_theme_config jsonb;
