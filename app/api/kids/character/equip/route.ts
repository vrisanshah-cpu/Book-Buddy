import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EQUIPPED_COLUMN, type CosmeticSlot } from "@/lib/character";

const VALID_SLOTS: CosmeticSlot[] = ["background", "body", "hair", "outfit", "accessory", "pet"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slot, itemId } = (await request.json()) as { slot: CosmeticSlot; itemId: string | null };
  if (!VALID_SLOTS.includes(slot)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  const column = EQUIPPED_COLUMN[slot];

  if (itemId === null) {
    const { error } = await supabase.from("users").update({ [column]: null }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: item } = await supabase.from("cosmetic_items").select("id, slot, is_starter").eq("id", itemId).maybeSingle();
  if (!item || item.slot !== slot) {
    return NextResponse.json({ error: "That item doesn't fit this slot" }, { status: 400 });
  }

  // Starters are free-for-everyone by design (no user_cosmetics row needed
  // — see the GET route's fallback logic), so ownership only needs
  // checking for non-starter items.
  if (!item.is_starter) {
    const { data: owned } = await supabase
      .from("user_cosmetics")
      .select("cosmetic_item_id")
      .eq("user_id", user.id)
      .eq("cosmetic_item_id", itemId)
      .maybeSingle();
    if (!owned) return NextResponse.json({ error: "You don't own that item" }, { status: 403 });
  }

  const { error } = await supabase.from("users").update({ [column]: itemId }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
