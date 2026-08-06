-- Phase B: accessibility preferences (dyslexia-friendly font toggle +
-- text scale), self-managed by the kid via app/kids/settings. Both are
-- plain columns on users rather than a new table since they're a single
-- 1:1 preference pair per user, same pattern as other per-user settings
-- already on this table.
--
-- No new RLS policy needed: "users_update_own" (migration 001) already
-- lets a user update their own row, which covers these two columns.

alter table public.users
  add column if not exists dyslexia_font boolean not null default false;

alter table public.users
  add column if not exists text_scale text not null default 'normal';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_text_scale_check'
  ) then
    alter table public.users
      add constraint users_text_scale_check
      check (text_scale in ('normal', 'large', 'xlarge'));
  end if;
end $$;
