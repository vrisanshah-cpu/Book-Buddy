-- Lets an existing child profile be linked to another parent account
-- (e.g. two parents in a household, or a parent recovering/recreating
-- their account) via a short-lived, one-time-use code.

alter table public.users add column if not exists link_code text unique;