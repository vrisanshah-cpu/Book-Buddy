-- Author collectible cards. Finishing a book has a chance to drop a card
-- for that book's author -- a light trading-card layer on top of the
-- existing badge/title rarity pattern (012). Schema only, no auto-run.
--
-- IMPORTANT DIFFERENCE FROM badges/titles: those two tables are catalog
-- data written only by the service-role admin client (see 012's comment --
-- "only the service-role admin client (cron routes) can write these").
-- author_cards can't work that way: a brand-new author is discovered live,
-- inside the normal per-request user session, the moment a kid finishes a
-- book nobody's read before. So author_cards allows authenticated INSERT
-- (catalog metadata only, no rarity inflation risk -- new entries always
-- start at 'common', see lib/author-cards.ts), and user_author_cards
-- allows authenticated users to write their own rows directly.

create table if not exists public.author_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  author_name text not null,
  fun_fact text not null,
  artifact_name text,
  artifact_description text,
  icon text not null default '📖',
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'legendary')),
  created_at timestamptz not null default now()
);

-- One row per (user, author) -- duplicates stack via `quantity` instead of
-- multiple rows, so the binder page can show "x3" instead of listing the
-- same card three times. `serial_codes` holds one unique-ish code per copy
-- ever pulled (oldest first); see mintSerialCode() in lib/author-cards.ts
-- for the format. These are flavor/collectible identifiers, not enforced
-- globally unique at the DB level -- a collision is a curiosity, not a bug.
create table if not exists public.user_author_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  card_id uuid not null references public.author_cards(id) on delete cascade,
  quantity int not null default 1,
  serial_codes text[] not null default '{}',
  first_earned_at timestamptz not null default now(),
  last_earned_at timestamptz not null default now(),
  source_event_id uuid references public.weekend_events(id) on delete set null,
  unique (user_id, card_id)
);

create index if not exists idx_author_cards_rarity on public.author_cards(rarity);
create index if not exists idx_user_author_cards_user on public.user_author_cards(user_id);

alter table public.author_cards enable row level security;
alter table public.user_author_cards enable row level security;

-- author_cards: public catalog, readable by anyone logged in (same as
-- badges/titles in 012).
drop policy if exists "author_cards_select" on public.author_cards;
create policy "author_cards_select" on public.author_cards for select to authenticated using (true);

-- Any signed-in kid can register a brand-new author encountered while
-- finishing a book. Deliberately no update/delete policy -- once a card
-- exists its fun fact/rarity shouldn't be quietly rewritten by a client.
drop policy if exists "author_cards_insert" on public.author_cards;
create policy "author_cards_insert" on public.author_cards for insert to authenticated with check (true);

-- user_author_cards: a kid can read and write only their own collection.
drop policy if exists "user_author_cards_select_own" on public.user_author_cards;
create policy "user_author_cards_select_own" on public.user_author_cards for select using (user_id = auth.uid());

drop policy if exists "user_author_cards_insert_own" on public.user_author_cards;
create policy "user_author_cards_insert_own" on public.user_author_cards for insert with check (user_id = auth.uid());

drop policy if exists "user_author_cards_update_own" on public.user_author_cards;
create policy "user_author_cards_update_own" on public.user_author_cards for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Seed a handful of well-known authors as guaranteed 'legendary'/'rare' so
-- the rarity tiers aren't purely random from day one. Anything not seeded
-- here gets created on the fly at 'common' the first time a kid finishes
-- one of their books (see getOrCreateAuthorCard in lib/author-cards.ts).
insert into public.author_cards (code, author_name, fun_fact, artifact_name, artifact_description, icon, rarity) values
  ('william-shakespeare', 'William Shakespeare', 'He invented or popularized hundreds of English words and phrases still used today, like "eyeball" and "swagger".', 'The Globe Quill', 'A battered feather quill, legend says, worn down writing 39 plays by candlelight.', '🖋️', 'legendary'),
  ('mark-twain', 'Mark Twain', 'His pen name comes from a riverboat term meaning the water was two fathoms deep -- safe to pass.', 'The Riverboat Compass', 'A brass pocket compass, said to have guided steamboats up and down the Mississippi.', '🛶', 'legendary'),
  ('charles-dickens', 'Charles Dickens', 'He used to act out his characters'' voices out loud while writing, right at his desk.', 'The Foggy Lantern', 'A dented tin lantern that somehow always seems to glow through London fog.', '🏮', 'legendary'),
  ('jane-austen', 'Jane Austen', 'She published her first novels anonymously, credited only to "A Lady".', 'The Drawing-Room Writing Desk', 'A small portable writing box, just big enough to hide away when visitors arrived.', '🪶', 'legendary'),
  ('dr-seuss', 'Dr. Seuss', 'He once wrote an entire bestselling book using only 50 different words.', 'The Cat''s Striped Hat', 'A tall red-and-white striped hat that never quite fits the shelf it''s stored on.', '🎩', 'rare'),
  ('roald-dahl', 'Roald Dahl', 'He wrote most of his stories in a small backyard hut, sitting in an old wingback chair.', 'The Chocolate Room Key', 'A small golden key that opens absolutely nothing anyone has found yet.', '🍫', 'rare'),
  ('j-k-rowling', 'J.K. Rowling', 'She originally wrote the first chapters of her most famous series on napkins in a cafe.', 'The Platform Ticket Stub', 'A well-worn train ticket stub with a platform number that keeps changing.', '🎫', 'rare'),
  ('e-b-white', 'E.B. White', 'Before writing children''s books, he spent decades writing essays for The New Yorker.', 'The Barn Web', 'A single strand of silk, framed, that some say still spells out words if you look closely.', '🕸️', 'rare')
on conflict (code) do nothing;
