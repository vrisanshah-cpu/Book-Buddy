-- Daily rewards system: daily spin, streak milestone rewards, and referrals.
--
-- Design note on the spin: this is deliberately NOT a variable-odds
-- casino-style jackpot. The audience is kids aged 5-12; randomized-payout
-- reward loops are the specific mechanic that makes slot machines
-- psychologically compulsive, and that's not something to build for
-- children regardless of how it's requested. claim_daily_spin() below
-- picks from a small, fixed, always-positive, publicly-documented range
-- (10-25 XP) — guaranteed reward every day, bounded and transparent, with
-- the "fun" coming from a spin animation client-side, not from hidden
-- odds. If real randomized jackpot mechanics are wanted for an adult
-- product later, that's a different, separate conversation.
--
-- All three reward paths (spin/streak/referral) go through SECURITY
-- DEFINER functions that decide the reward server-side and write the
-- ledger row + XP update atomically — same pattern as spend_xp /
-- grant_shop_item (migration 020) and grant_cosmetic_item (migration
-- 029). A kid's own RLS-scoped client can call these safely; it can
-- never control the reward amount, since that's chosen inside the
-- function, not passed in as a parameter.

create table if not exists public.daily_spins (
  user_id uuid not null references public.users(id) on delete cascade,
  spin_date date not null,
  xp_awarded int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, spin_date)
);

create table if not exists public.streak_reward_claims (
  user_id uuid not null references public.users(id) on delete cascade,
  streak_milestone int not null check (streak_milestone in (3, 7, 14, 30)),
  xp_awarded int not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, streak_milestone)
);

alter table public.users add column if not exists referral_code text unique;
alter table public.users add column if not exists referred_by_user_id uuid references public.users(id) on delete set null;

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null unique references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded')),
  xp_awarded int,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);

alter table public.daily_spins enable row level security;
alter table public.streak_reward_claims enable row level security;
alter table public.referral_rewards enable row level security;

drop policy if exists "daily_spins_select_own" on public.daily_spins;
create policy "daily_spins_select_own" on public.daily_spins for select using (auth.uid() = user_id);

drop policy if exists "streak_reward_claims_select_own" on public.streak_reward_claims;
create policy "streak_reward_claims_select_own" on public.streak_reward_claims for select using (auth.uid() = user_id);

drop policy if exists "referral_rewards_select_own" on public.referral_rewards;
create policy "referral_rewards_select_own" on public.referral_rewards for select
  using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

-- No insert/update policies on any of the three tables above, on purpose
-- — every write happens inside a SECURITY DEFINER function below, never
-- as a direct client insert. This is the same "no direct write policy"
-- pattern migration 012 uses for badges/titles and the cron-only
-- weekend_events tables.

create or replace function public.claim_daily_spin(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_amount int;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if exists (select 1 from public.daily_spins where user_id = p_user_id and spin_date = v_today) then
    return null; -- already claimed today
  end if;

  -- Fixed, bounded, always-positive pool — see the header note above.
  v_amount := (array[10, 15, 20, 25])[1 + floor(random() * 4)::int];

  insert into public.daily_spins (user_id, spin_date, xp_awarded)
  values (p_user_id, v_today, v_amount);

  update public.users set xp = xp + v_amount where id = p_user_id;

  return v_amount;
end;
$$;

create or replace function public.claim_streak_reward(p_user_id uuid, p_milestone int, p_current_streak int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp int;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  if p_milestone not in (3, 7, 14, 30) then
    raise exception 'Invalid milestone';
  end if;
  -- p_current_streak is computed server-side by the calling API route
  -- (lib/reading-stats.ts:calculateStreak, same function the Challenges
  -- page already trusts) and passed in as a second layer of defense —
  -- this check is the actual source of truth, so a stale/forged client
  -- value can't unlock a reward the kid hasn't really earned.
  if p_current_streak < p_milestone then
    raise exception 'Streak milestone not yet reached';
  end if;
  if exists (select 1 from public.streak_reward_claims where user_id = p_user_id and streak_milestone = p_milestone) then
    return null; -- already claimed
  end if;

  v_xp := case p_milestone
    when 3 then 30
    when 7 then 75
    when 14 then 150
    when 30 then 300
  end;

  insert into public.streak_reward_claims (user_id, streak_milestone, xp_awarded)
  values (p_user_id, p_milestone, v_xp);

  update public.users set xp = xp + v_xp where id = p_user_id;

  return v_xp;
end;
$$;

create or replace function public.apply_referral_code(p_user_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  select id into v_referrer_id from public.users where referral_code = p_code;

  if v_referrer_id is null then
    return false; -- no such code
  end if;
  if v_referrer_id = p_user_id then
    return false; -- can't refer yourself
  end if;
  if exists (select 1 from public.referral_rewards where referred_user_id = p_user_id) then
    return false; -- this user already has a referral recorded
  end if;

  update public.users set referred_by_user_id = v_referrer_id where id = p_user_id;

  insert into public.referral_rewards (referrer_id, referred_user_id, status)
  values (v_referrer_id, p_user_id, 'pending');

  return true;
end;
$$;

-- Reward is granted the first time a referred kid actually logs a
-- reading session — not on signup — so this can't be farmed by creating
-- throwaway accounts for instant XP. Fires as a trigger (not tied to any
-- specific "log a session" route) so it works no matter which code path
-- inserts the session row.
create or replace function public.check_referral_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral record;
begin
  select * into v_referral from public.referral_rewards
  where referred_user_id = new.user_id and status = 'pending'
  limit 1;

  if found then
    update public.referral_rewards
    set status = 'rewarded', xp_awarded = 100, rewarded_at = now()
    where id = v_referral.id;

    update public.users set xp = xp + 100 where id = v_referral.referrer_id;
    update public.users set xp = xp + 25 where id = new.user_id; -- welcome bonus for the referred kid too
  end if;

  return new;
end;
$$;

drop trigger if exists reading_session_referral_check on public.reading_sessions;
create trigger reading_session_referral_check
  after insert on public.reading_sessions
  for each row execute function public.check_referral_completion();
