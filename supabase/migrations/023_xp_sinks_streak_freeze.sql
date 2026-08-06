-- Phase K: streak freeze consumption + a real XP spending ledger.
--
-- Deliberately NOT adding a separate users.streak_freezes_available
-- counter as the original plan sketched — Phase H already tracks owned
-- streak freezes as inventory (user_shop_items where the item's code is
-- 'streak_freeze'), and consume_shop_item() (migration 020) is already
-- the correct atomic way to spend one. A second counter would just be a
-- redundant, driftable copy of the same fact.
--
-- active_xp_booster_until IS new state — Phase H only tracks that a
-- booster was *bought* (inventory), not that one is currently *active*.

alter table public.users add column if not exists active_xp_booster_until timestamptz;

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists xp_transactions_user_id_idx on public.xp_transactions (user_id, created_at desc);

alter table public.xp_transactions enable row level security;

drop policy if exists "xp_transactions_select_own" on public.xp_transactions;
create policy "xp_transactions_select_own" on public.xp_transactions for select
  using (user_id = auth.uid());

-- No insert/update/delete policy: rows only ever come from spend_xp()
-- below or the admin client (lib/challenges.ts, buddy challenge bonus),
-- never a direct client write.

create table if not exists public.streak_freeze_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  frozen_date date not null,
  created_at timestamptz not null default now()
);

alter table public.streak_freeze_events enable row level security;

drop policy if exists "streak_freeze_events_select_own" on public.streak_freeze_events;
create policy "streak_freeze_events_select_own" on public.streak_freeze_events for select
  using (user_id = auth.uid());

drop policy if exists "streak_freeze_events_insert_own" on public.streak_freeze_events;
create policy "streak_freeze_events_insert_own" on public.streak_freeze_events for insert
  with check (user_id = auth.uid());

-- Re-declares spend_xp (originally migration 020) with an added p_reason
-- so every purchase now logs to xp_transactions. The 2-arg version is
-- dropped so PostgREST has one unambiguous signature to call.
drop function if exists public.spend_xp(uuid, int);

create or replace function public.spend_xp(p_user_id uuid, p_amount int, p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Can only spend your own XP';
  end if;

  update public.users
  set xp = xp - p_amount
  where id = p_user_id and xp >= p_amount;

  get diagnostics v_rows = row_count;

  if v_rows > 0 then
    insert into public.xp_transactions (user_id, amount, reason)
    values (p_user_id, -p_amount, coalesce(p_reason, 'purchase'));
  end if;

  return v_rows > 0;
end;
$$;

grant execute on function public.spend_xp(uuid, int, text) to authenticated;
