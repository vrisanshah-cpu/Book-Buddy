-- Phase 4: AI cost optimization -- response caching + opt-in AI weekly digest.

-- Generic response cache for callGemini(). Keyed by a sha256 hash of
-- (model + caller-supplied semantic cache key), so callers control what
-- counts as "the same request" -- e.g. book title + author for a quiz,
-- deliberately excluding user id or timestamp so repeat requests for the
-- same book across different kids hit the cache instead of Gemini.
create table if not exists public.ai_response_cache (
  cache_key text primary key,
  response text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists ai_response_cache_expires_at_idx
  on public.ai_response_cache (expires_at);

-- Service-role only: this table is never read or written directly from
-- the client, only from lib/gemini.ts via the admin client.
alter table public.ai_response_cache enable row level security;

-- Parents default to the free, template-only weekly digest. AI summaries
-- are an explicit opt-in (Parent Settings > "Enhanced AI Weekly Reading
-- Summary"), so the cron job never spends a Gemini call unless a parent
-- has asked for it.
alter table public.users add column if not exists ai_weekly_summary_enabled boolean not null default false;
