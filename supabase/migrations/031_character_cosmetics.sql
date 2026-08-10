-- Custom Character System — replaces the Shop's 'avatar_accessory',
-- 'pet', and 'shelf_theme' categories with a real layered dress-up
-- character. 'xp_booster' and 'streak_freeze' (Phase H/K) are untouched
-- — those are gameplay utility, not cosmetics.
--
-- Rendering is a "paper doll": every cosmetic_items.image_url is a
-- transparent PNG on the same 600x800 canvas, pre-aligned by whoever
-- makes the art. Layers stack background -> body -> outfit -> hair ->
-- accessory -> pet (pet frontmost). See components/kids/CharacterCanvas.tsx.

create table if not exists public.cosmetic_items (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in ('background', 'body', 'hair', 'outfit', 'accessory', 'pet')),
  name text not null,
  image_url text not null,
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  xp_cost int not null default 0 check (xp_cost >= 0),
  collection text,
  is_starter boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_cosmetics (
  user_id uuid not null references public.users(id) on delete cascade,
  cosmetic_item_id uuid not null references public.cosmetic_items(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, cosmetic_item_id)
);

create table if not exists public.cosmetic_trade_offers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  offered_item_id uuid not null references public.cosmetic_items(id) on delete cascade,
  requested_item_id uuid not null references public.cosmetic_items(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint cosmetic_trade_offers_not_self check (sender_id <> receiver_id)
);

-- Retire the old cosmetic equip slots (avatar_accessory/pet/shelf_theme
-- are going away entirely, so these columns no longer point at anything
-- meaningful). Existing user_shop_items rows for those categories are
-- left alone as history rather than deleted, but nothing reads them
-- after this migration.
alter table public.users drop column if exists equipped_avatar_accessory_id;
alter table public.users drop column if exists equipped_shelf_theme_id;
alter table public.users drop column if exists equipped_pet_id;

alter table public.users add column if not exists equipped_background_id uuid references public.cosmetic_items(id) on delete set null;
alter table public.users add column if not exists equipped_body_id uuid references public.cosmetic_items(id) on delete set null;
alter table public.users add column if not exists equipped_hair_id uuid references public.cosmetic_items(id) on delete set null;
alter table public.users add column if not exists equipped_outfit_id uuid references public.cosmetic_items(id) on delete set null;
alter table public.users add column if not exists equipped_accessory_cosmetic_id uuid references public.cosmetic_items(id) on delete set null;
alter table public.users add column if not exists equipped_pet_cosmetic_id uuid references public.cosmetic_items(id) on delete set null;

-- shop_items.category narrows to just the two survivors. Existing rows
-- in the retired categories are left in place (order/purchase history),
-- just no longer sellable — the check constraint only affects new rows.
alter table public.shop_items drop constraint if exists shop_items_category_check;
alter table public.shop_items add constraint shop_items_category_check
  check (category in ('avatar_accessory', 'shelf_theme', 'pet', 'xp_booster', 'streak_freeze'));
-- (Old categories stay valid in the CHECK so existing rows don't violate
-- it — enforcement that new items can't use them lives in the shop's
-- seed data and admin UI, not the constraint, since a stricter
-- constraint would also block reading/keeping the historical rows.)

create index if not exists cosmetic_items_slot_idx on public.cosmetic_items (slot);
create unique index if not exists cosmetic_items_one_starter_per_slot_idx on public.cosmetic_items (slot) where is_starter = true;
create unique index if not exists cosmetic_items_collection_slot_name_idx on public.cosmetic_items (collection, slot, name) where collection is not null;
create index if not exists user_cosmetics_user_id_idx on public.user_cosmetics (user_id);
create index if not exists cosmetic_trade_offers_sender_idx on public.cosmetic_trade_offers (sender_id);
create index if not exists cosmetic_trade_offers_receiver_idx on public.cosmetic_trade_offers (receiver_id);

alter table public.cosmetic_items enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.cosmetic_trade_offers enable row level security;

drop policy if exists "cosmetic_items_select" on public.cosmetic_items;
create policy "cosmetic_items_select" on public.cosmetic_items for select to authenticated using (true);

drop policy if exists "cosmetic_items_admin_manage" on public.cosmetic_items;
create policy "cosmetic_items_admin_manage" on public.cosmetic_items for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "user_cosmetics_select_own" on public.user_cosmetics;
create policy "user_cosmetics_select_own" on public.user_cosmetics for select
  using (user_id = auth.uid());

-- No insert/update/delete policy on user_cosmetics: ownership only ever
-- changes via spend_xp() + grant_cosmetic_item() or
-- accept_cosmetic_trade_offer() below, all SECURITY DEFINER.

drop policy if exists "cosmetic_trade_offers_select_participant" on public.cosmetic_trade_offers;
create policy "cosmetic_trade_offers_select_participant" on public.cosmetic_trade_offers for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "cosmetic_trade_offers_insert_own" on public.cosmetic_trade_offers;
create policy "cosmetic_trade_offers_insert_own" on public.cosmetic_trade_offers for insert
  with check (sender_id = auth.uid());

drop policy if exists "cosmetic_trade_offers_cancel_own" on public.cosmetic_trade_offers;
create policy "cosmetic_trade_offers_cancel_own" on public.cosmetic_trade_offers for update
  using (sender_id = auth.uid() and status = 'pending')
  with check (status = 'cancelled');

drop policy if exists "cosmetic_trade_offers_decline_own" on public.cosmetic_trade_offers;
create policy "cosmetic_trade_offers_decline_own" on public.cosmetic_trade_offers for update
  using (receiver_id = auth.uid() and status = 'pending')
  with check (status = 'declined');

-- Grants (or no-ops if already owned) one cosmetic item. Only ever
-- called after spend_xp() succeeds — see app/api/kids/character/purchase.
create or replace function public.grant_cosmetic_item(p_user_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() then
    raise exception 'Can only grant items to yourself';
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_item_id)
  values (p_user_id, p_item_id)
  on conflict (user_id, cosmetic_item_id) do nothing;
end;
$$;

grant execute on function public.grant_cosmetic_item(uuid, uuid) to authenticated;

-- Atomic swap for cosmetic trades — same row-locked pattern as
-- accept_trade_offer() (migration 020).
create or replace function public.accept_cosmetic_trade_offer(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade record;
  v_sender_owns boolean;
  v_receiver_owns boolean;
begin
  select * into v_trade from public.cosmetic_trade_offers where id = p_trade_id for update;

  if v_trade is null then
    raise exception 'Trade not found';
  end if;
  if v_trade.status <> 'pending' then
    raise exception 'This trade is no longer pending';
  end if;
  if v_trade.receiver_id <> auth.uid() then
    raise exception 'Only the receiver can accept this trade';
  end if;

  select exists (
    select 1 from public.user_cosmetics
    where user_id = v_trade.sender_id and cosmetic_item_id = v_trade.offered_item_id
  ) into v_sender_owns;
  select exists (
    select 1 from public.user_cosmetics
    where user_id = v_trade.receiver_id and cosmetic_item_id = v_trade.requested_item_id
  ) into v_receiver_owns;

  if not v_sender_owns then
    raise exception 'The other trader no longer has that item';
  end if;
  if not v_receiver_owns then
    raise exception 'You no longer have the requested item';
  end if;

  delete from public.user_cosmetics where user_id = v_trade.sender_id and cosmetic_item_id = v_trade.offered_item_id;
  insert into public.user_cosmetics (user_id, cosmetic_item_id) values (v_trade.receiver_id, v_trade.offered_item_id)
    on conflict (user_id, cosmetic_item_id) do nothing;

  delete from public.user_cosmetics where user_id = v_trade.receiver_id and cosmetic_item_id = v_trade.requested_item_id;
  insert into public.user_cosmetics (user_id, cosmetic_item_id) values (v_trade.sender_id, v_trade.requested_item_id)
    on conflict (user_id, cosmetic_item_id) do nothing;

  update public.cosmetic_trade_offers set status = 'accepted' where id = p_trade_id;
end;
$$;

grant execute on function public.accept_cosmetic_trade_offer(uuid) to authenticated;

-- storage bucket for cosmetic art (public read, admin-only write via the
-- storage.objects policies below)
insert into storage.buckets (id, name, public)
values ('cosmetics', 'cosmetics', true)
on conflict (id) do nothing;

drop policy if exists "cosmetics_bucket_select" on storage.objects;
create policy "cosmetics_bucket_select" on storage.objects for select
  using (bucket_id = 'cosmetics');

drop policy if exists "cosmetics_bucket_admin_write" on storage.objects;
create policy "cosmetics_bucket_admin_write" on storage.objects for insert
  with check (bucket_id = 'cosmetics' and public.is_admin());

drop policy if exists "cosmetics_bucket_admin_delete" on storage.objects;
create policy "cosmetics_bucket_admin_delete" on storage.objects for delete
  using (bucket_id = 'cosmetics' and public.is_admin());

-- Starter looks (free, is_starter=true) so every kid has a base
-- character before ever visiting the wardrobe. Shipped as static files
-- in public/character-starters/ rather than the Storage bucket — bundled
-- with the app itself so they're always available, unlike monthly-drop
-- art which lives in Storage. Purely placeholder art; replace/supplement
-- via the admin upload UI whenever real starter art is ready.
insert into public.cosmetic_items (slot, name, image_url, rarity, xp_cost, is_starter, sort_order) values
  ('body', 'Default', '/character-starters/body-default.png', 'common', 0, true, 0),
  ('hair', 'Default Hair', '/character-starters/hair-default.png', 'common', 0, true, 0),
  ('outfit', 'Default Outfit', '/character-starters/outfit-default.png', 'common', 0, true, 0)
on conflict (slot) where is_starter = true do nothing;

-- Launch collection (collection='launch') so the wardrobe has real
-- content on day one, before the first monthly drop. Same placeholder
-- art style as the starters above.
insert into public.cosmetic_items (slot, name, image_url, rarity, xp_cost, collection, sort_order) values
  ('hair', 'Curly Hair', '/character-starters/hair-curly.png', 'common', 80, 'launch', 1),
  ('hair', 'Ponytail', '/character-starters/hair-ponytail.png', 'common', 80, 'launch', 2),
  ('outfit', 'Superhero Suit', '/character-starters/outfit-superhero.png', 'rare', 200, 'launch', 1),
  ('outfit', 'Overalls', '/character-starters/outfit-overalls.png', 'common', 100, 'launch', 2),
  ('accessory', 'Reading Glasses', '/character-starters/accessory-glasses.png', 'common', 60, 'launch', 1),
  ('accessory', 'Wizard Hat', '/character-starters/accessory-wizard-hat.png', 'rare', 180, 'launch', 2),
  ('background', 'Sunset Sky', '/character-starters/background-sunset.png', 'common', 100, 'launch', 1),
  ('background', 'Starry Night', '/character-starters/background-starry-night.png', 'rare', 150, 'launch', 2),
  ('pet', 'Loyal Puppy', '/character-starters/pet-puppy.png', 'epic', 350, 'launch', 1)
on conflict (collection, slot, name) where collection is not null do nothing;
