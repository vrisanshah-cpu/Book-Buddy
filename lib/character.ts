import type { SupabaseClient } from "@supabase/supabase-js";

export type CosmeticSlot = "background" | "body" | "hair" | "outfit" | "accessory" | "pet";
/** Rendering z-order, back to front — see components/kids/CharacterCanvas.tsx. */
export const SLOT_RENDER_ORDER: CosmeticSlot[] = ["background", "body", "outfit", "hair", "accessory", "pet"];

/** Order the wardrobe UI presents slot tabs in — background first since it's the easiest/cheapest pick. */
export const SLOT_TAB_ORDER: CosmeticSlot[] = ["background", "body", "hair", "outfit", "accessory", "pet"];

export const SLOT_LABELS: Record<CosmeticSlot, string> = {
  background: "Background",
  body: "Body",
  hair: "Hair",
  outfit: "Outfit",
  accessory: "Accessory",
  pet: "Pet",
};

/** users.equipped_<slot>_id column name per slot (migration 027). */
export const EQUIPPED_COLUMN: Record<CosmeticSlot, string> = {
  background: "equipped_background_id",
  body: "equipped_body_id",
  hair: "equipped_hair_id",
  outfit: "equipped_outfit_id",
  accessory: "equipped_accessory_cosmetic_id",
  pet: "equipped_pet_cosmetic_id",
};

export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot;
  name: string;
  image_url: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_cost: number;
  collection: string | null;
  is_starter: boolean;
}

/**
 * Resolves a kid's currently-equipped cosmetic per slot, falling back to
 * the free starter for slots that have one (body/hair/outfit) and to
 * "nothing" for the rest — so every kid always has a base look even
 * before ever visiting /kids/character. Shared between the wardrobe API
 * route and the homescreen so they never drift out of sync.
 */
export async function resolveEquippedCharacter(
  supabase: SupabaseClient,
  userId: string
): Promise<Partial<Record<CosmeticSlot, CosmeticItem | null>>> {
  const [{ data: catalog }, { data: profile }] = await Promise.all([
    supabase.from("cosmetic_items").select("*"),
    supabase
      .from("users")
      .select(
        "equipped_background_id, equipped_body_id, equipped_hair_id, equipped_outfit_id, equipped_accessory_cosmetic_id, equipped_pet_cosmetic_id"
      )
      .eq("id", userId)
      .single(),
  ]);

  const items = (catalog ?? []) as CosmeticItem[];
  const byId = new Map(items.map((i) => [i.id, i]));
  const starterBySlot = new Map(items.filter((i) => i.is_starter).map((i) => [i.slot, i]));

  const equipped: Partial<Record<CosmeticSlot, CosmeticItem | null>> = {};
  for (const slot of SLOT_RENDER_ORDER) {
    const equippedId = profile?.[EQUIPPED_COLUMN[slot] as keyof typeof profile] as string | null | undefined;
    equipped[slot] = (equippedId ? byId.get(equippedId) : null) ?? starterBySlot.get(slot) ?? null;
  }
  return equipped;
}
