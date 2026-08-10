-- Phase: institution branding — a kid can enter their school/company code
-- in Settings to link their account to an institution, then sees a small
-- branded welcome banner (name/logo/message) on their homescreen. Admins
-- get a live feed of recent signups in the existing institution catalog
-- panel.
--
-- Reuses the existing institutions / users.institution_id concept from
-- migration 026 — no new tables needed.

alter table public.institutions add column if not exists logo_url text;
alter table public.institutions add column if not exists welcome_message text;

-- Institutions:
-- - "institutions_select" (migration 026) already lets any authenticated
--   user read these two new columns once added.
-- - "institutions_admin_manage" (migration 026) already lets admins set
--   them via the admin institution catalog UI.
-- - "users_update_own" (migration 001) already lets a kid set their own
--   users.institution_id — this is a self-write, so no admin client is
--   needed for the join flow.
--
-- Users: the new admin "recent signups" feed is a genuine cross-user
-- read (an admin listing other users' display_name/institution), which
-- existing policies don't cover — users_select_own/parent_children/
-- teacher_students all require a specific relationship to the row. This
-- adds a narrow admin-only select policy, following the same
-- public.is_admin() pattern already used on institutions/institution_books,
-- rather than reaching for the service-role admin client for this read.
drop policy if exists "users_select_admin" on public.users;
create policy "users_select_admin" on public.users for select using (public.is_admin());
