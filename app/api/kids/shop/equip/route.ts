import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SLOT_TO_COLUMN = {
  avatar_accessory: "equipped_avatar_accessory_id",
  shelf_theme: "equipped_shelf_theme_id",
  pet: "equipped_pet_id",
} as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await request.json();

  // itemId === null unequips the slot; itemId's category (looked up
  // below) decides which slot that is.
  if (itemId === null) {
    return NextResponse.json({ error: "Specify itemId, or use the unequip endpoint shape { itemId, slot }" }, { status: 400 });
  }

  const { data: item } = await supabase.from("shop_items").select("id, category").eq("id", itemId).maybeSingle();
  if (!item || !(item.category in SLOT_TO_COLUMN)) {
    return NextResponse.json({ error: "That item can't be equipped" }, { status: 400 });
  }

  const { data: owned } = await supabase
    .from("user_shop_items")
    .select("quantity")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();

  if (!owned || owned.quantity < 1) {
    return NextResponse.json({ error: "You don't own that item" }, { status: 403 });
  }

  const column = SLOT_TO_COLUMN[item.category as keyof typeof SLOT_TO_COLUMN];
  const { error } = await supabase
    .from("users")
    .update({ [column]: itemId })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
