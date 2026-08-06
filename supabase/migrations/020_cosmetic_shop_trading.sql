-- Phase H: cosmetic shop + peer trading. XP purchases and trade accepts
-- both need to be atomic (a kid shouldn't be able to double-spend XP by
-- firing two purchases at once, and a trade must swap both sides or
-- neither). PostgREST/supabase-js calls are separate round trips, so
-- "atomic" here means doing the read-check-write inside a single
-- SECURITY DEFINER function (spend_xp, accept_trade_offer) rather than
-- several admin-client calls in a row from the API route — that's what
-- actually gets you a single transaction.

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('avatar_accessory', 'shelf_theme', 'pet', 'xp_booster', 'streak_freeze')),
  icon_or_asset text not null,
  xp_cost int not null check (xp_cost >= 0),
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary'))
);

create table if not exists public.user_shop_items (
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  quantity int not null default 1 check (quantity >= 0),
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  offered_item_id uuid not null references public.shop_items(id) on delete cascade,
  requested_item_id uuid not null references public.shop_items(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint trade_offers_not_self check (sender_id <> receiver_id)
);

alter table public.users add column if not exists equipped_avatar_accessory_id uuid references public.shop_items(id);
alter table public.users add column if not exists equipped_shelf_theme_id uuid references public.shop_items(id);
alter table public.users add column if not exists equipped_pet_id uuid references public.shop_items(id);

create index if not exists trade_offers_sender_idx on public.trade_offers (sender_id);
create index if not exists trade_offers_receiver_idx on public.trade_offers (receiver_id);

alter table public.shop_items enable row level security;
alter table public.user_shop_items enable row level security;
alter table public.trade_offers enable row level security;

drop policy if exists "shop_items_select" on public.shop_items;
create policy "shop_items_select" on public.shop_items for select to authenticated using (true);

drop policy if exists "user_shop_items_select_own" on public.user_shop_items;
create policy "user_shop_items_select_own" on public.user_shop_items for select using (user_id = auth.uid());

-- Any other visibility into user_shop_items (buying, trading) goes through
-- the SECURITY DEFINER functions below, which is why there's no general
-- insert/update policy here.

drop policy if exists "trade_offers_select_participant" on public.trade_offers;
create policy "trade_offers_select_participant" on public.trade_offers for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "trade_offers_insert_own" on public.trade_offers;
create policy "trade_offers_insert_own" on public.trade_offers for insert
  with check (sender_id = auth.uid());

drop policy if exists "trade_offers_cancel_own" on public.trade_offers;
create policy "trade_offers_cancel_own" on public.trade_offers for update
  using (sender_id = auth.uid() and status = 'pending')
  with check (status = 'cancelled');

drop policy if exists "trade_offers_decline_own" on public.trade_offers;
create policy "trade_offers_decline_own" on public.trade_offers for update
  using (receiver_id = auth.uid() and status = 'pending')
  with check (status = 'declined');

-- Atomically deducts XP, guarded by the WHERE clause so two concurrent
-- purchases can't both succeed off the same starting balance.
create or replace function public.spend_xp(p_user_id uuid, p_amount int)
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
  return v_rows > 0;
end;
$$;

grant execute on function public.spend_xp(uuid, int) to authenticated;

-- Grants (or increments) one unit of a shop item. Only ever called after
-- spend_xp() succeeds (see app/api/kids/shop/purchase) or as part of
-- accept_trade_offer() below.
create or replace function public.grant_shop_item(p_user_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() then
    raise exception 'Can only grant items to yourself';
  end if;

  insert into public.user_shop_items (user_id, item_id, quantity)
  values (p_user_id, p_item_id, 1)
  on conflict (user_id, item_id) do update set quantity = public.user_shop_items.quantity + 1;
end;
$$;

grant execute on function public.grant_shop_item(uuid, uuid) to authenticated;

-- Consumes one unit of an owned item (e.g. redeeming a streak freeze or
-- activating a booster). Returns false if the caller doesn't own one.
create or replace function public.consume_shop_item(p_item_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_qty int;
begin
  select id into v_item_id from public.shop_items where code = p_item_code;
  if v_item_id is null then
    return false;
  end if;

  select quantity into v_qty from public.user_shop_items
    where user_id = auth.uid() and item_id = v_item_id
    for update;

  if coalesce(v_qty, 0) < 1 then
    return false;
  end if;

  if v_qty = 1 then
    delete from public.user_shop_items where user_id = auth.uid() and item_id = v_item_id;
  else
    update public.user_shop_items set quantity = quantity - 1
      where user_id = auth.uid() and item_id = v_item_id;
  end if;

  return true;
end;
$$;

grant execute on function public.consume_shop_item(text) to authenticated;

-- Atomically swaps both sides of a pending trade (or fails entirely) —
-- row-locks the trade so it can't be accepted twice, and re-checks both
-- parties still hold the relevant item before moving anything.
create or replace function public.accept_trade_offer(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade record;
  v_sender_qty int;
  v_receiver_qty int;
begin
  select * into v_trade from public.trade_offers where id = p_trade_id for update;

  if v_trade is null then
    raise exception 'Trade not found';
  end if;
  if v_trade.status <> 'pending' then
    raise exception 'This trade is no longer pending';
  end if;
  if v_trade.receiver_id <> auth.uid() then
    raise exception 'Only the receiver can accept this trade';
  end if;

  select quantity into v_sender_qty from public.user_shop_items
    where user_id = v_trade.sender_id and item_id = v_trade.offered_item_id;
  select quantity into v_receiver_qty from public.user_shop_items
    where user_id = v_trade.receiver_id and item_id = v_trade.requested_item_id;

  if coalesce(v_sender_qty, 0) < 1 then
    raise exception 'The other trader no longer has that item';
  end if;
  if coalesce(v_receiver_qty, 0) < 1 then
    raise exception 'You no longer have the requested item';
  end if;

  if v_sender_qty = 1 then
    delete from public.user_shop_items where user_id = v_trade.sender_id and item_id = v_trade.offered_item_id;
  else
    update public.user_shop_items set quantity = quantity - 1
      where user_id = v_trade.sender_id and item_id = v_trade.offered_item_id;
  end if;
  insert into public.user_shop_items (user_id, item_id, quantity)
  values (v_trade.receiver_id, v_trade.offered_item_id, 1)
  on conflict (user_id, item_id) do update set quantity = public.user_shop_items.quantity + 1;

  if v_receiver_qty = 1 then
    delete from public.user_shop_items where user_id = v_trade.receiver_id and item_id = v_trade.requested_item_id;
  else
    update public.user_shop_items set quantity = quantity - 1
      where user_id = v_trade.receiver_id and item_id = v_trade.requested_item_id;
  end if;
  insert into public.user_shop_items (user_id, item_id, quantity)
  values (v_trade.sender_id, v_trade.requested_item_id, 1)
  on conflict (user_id, item_id) do update set quantity = public.user_shop_items.quantity + 1;

  update public.trade_offers set status = 'accepted' where id = p_trade_id;
end;
$$;

grant execute on function public.accept_trade_offer(uuid) to authenticated;

-- Seed catalog (15 items across all 5 categories). Idempotent on `code`.
insert into public.shop_items (code, name, category, icon_or_asset, xp_cost, rarity) values
  ('acc_wizard_hat', 'Wizard Hat', 'avatar_accessory', '🧙', 150, 'rare'),
  ('acc_crown', 'Golden Crown', 'avatar_accessory', '👑', 400, 'epic'),
  ('acc_sunglasses', 'Cool Sunglasses', 'avatar_accessory', '😎', 80, 'common'),
  ('acc_bow_tie', 'Bow Tie', 'avatar_accessory', '🎀', 60, 'common'),
  ('acc_monocle', 'Fancy Monocle', 'avatar_accessory', '🧐', 70, 'common'),
  ('theme_galaxy', 'Galaxy Shelf', 'shelf_theme', '🌌', 200, 'rare'),
  ('theme_forest', 'Forest Shelf', 'shelf_theme', '🌲', 100, 'common'),
  ('theme_candy', 'Candy Shelf', 'shelf_theme', '🍬', 180, 'rare'),
  ('pet_charlotte', 'Charlotte', 'pet', '🕷️', 350, 'epic'),
  ('pet_cheshire', 'Cheshire Cat', 'pet', '😺', 350, 'epic'),
  ('pet_dragon', 'Baby Dragon', 'pet', '🐉', 600, 'legendary'),
  ('pet_owl', 'Wise Owl', 'pet', '🦉', 200, 'rare'),
  ('pet_fox', 'Clever Fox', 'pet', '🦊', 120, 'common'),
  ('booster_2x_24h', '2x XP Booster (24h)', 'xp_booster', '⚡', 250, 'common'),
  ('streak_freeze', 'Streak Freeze', 'streak_freeze', '🧊', 150, 'common')
on conflict (code) do nothing;
