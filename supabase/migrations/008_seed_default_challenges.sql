-- Default global challenges (classroom_id is null -> auto-enrolled for every
-- kid via enrollInAvailableChallenges). Without these, new accounts see an
-- empty Challenges page until a teacher manually creates one.

alter table public.challenges add column if not exists is_default boolean not null default false;
create unique index if not exists challenges_title_default_unique
  on public.challenges (title) where is_default = true;

insert into public.challenges (title, description, type, target_value, badge_icon, created_by, classroom_id, start_date, end_date, is_default)
values
  ('First Steps', 'Read for 3 days in a row.', 'reading_streak', 3, '🔥', null, null, null, null, true),
  ('Week-Long Reader', 'Read for 7 days in a row.', 'reading_streak', 7, '⭐', null, null, null, null, true),
  ('Bookworm', 'Finish 3 books.', 'books_finished', 3, '📚', null, null, null, null, true),
  ('Bookshelf Builder', 'Finish 10 books.', 'books_finished', 10, '🏆', null, null, null, null, true),
  ('60 Minute Club', 'Read for 60 total minutes.', 'minutes_read', 60, '⏱️', null, null, null, null, true),
  ('300 Minute Marathon', 'Read for 300 total minutes.', 'minutes_read', 300, '🏅', null, null, null, null, true),
  ('Quiz Whiz', 'Score 80 or higher on a reading quiz.', 'quiz_score', 80, '🧠', null, null, null, null, true),
  ('Perfect Score', 'Get a perfect quiz score of 100.', 'quiz_score', 100, '💯', null, null, null, null, true)
on conflict (title) where is_default = true do nothing;