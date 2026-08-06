import type { SupabaseClient } from "@supabase/supabase-js";

export interface EquippedCosmeticItem {
  id: string;
  name: string;
  icon_or_asset: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface EquippedCosmetics {
  accessory: EquippedCosmeticItem | null;
  pet: EquippedCosmeticItem | null;
  shelfTheme: EquippedCosmeticItem | null;
}

/**
 * Shop purchases (avatar_accessory / pet / shelf_theme) are equipped by
 * writing an id onto users.equipped_avatar_accessory_id /
 * equipped_pet_id / equipped_shelf_theme_id (see
 * app/api/kids/shop/equip/route.ts) -- but nothing outside the shop page
 * itself used to read those columns back, so a kid could buy and
 * "equip" a pet or theme and never see it anywhere. This is the one
 * place that resolves those three ids into the actual shop_items rows,
 * so every screen that shows equipped cosmetics uses the same lookup.
 */
export async function getEquippedCosmetics(
  supabase: SupabaseClient,
  profile: {
    equipped_avatar_accessory_id: string | null;
    equipped_pet_id: string | null;
    equipped_shelf_theme_id: string | null;
  } | null
): Promise<EquippedCosmetics> {
  const ids = [
    profile?.equipped_avatar_accessory_id,
    profile?.equipped_pet_id,
    profile?.equipped_shelf_theme_id,
  ].filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return { accessory: null, pet: null, shelfTheme: null };
  }

  const { data } = await supabase
    .from("shop_items")
    .select("id, name, icon_or_asset, rarity")
    .in("id", ids);

  const byId = new Map((data ?? []).map((item) => [item.id, item as EquippedCosmeticItem]));

  return {
    accessory: (profile?.equipped_avatar_accessory_id && byId.get(profile.equipped_avatar_accessory_id)) || null,
    pet: (profile?.equipped_pet_id && byId.get(profile.equipped_pet_id)) || null,
    shelfTheme: (profile?.equipped_shelf_theme_id && byId.get(profile.equipped_shelf_theme_id)) || null,
  };
}
