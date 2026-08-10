import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveEquippedCharacter } from "@/lib/character";
import type { CosmeticItem } from "@/lib/character";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: catalog }, { data: ownedRows }, { data: profile }, equipped] = await Promise.all([
    supabase.from("cosmetic_items").select("*").order("slot").order("sort_order"),
    supabase.from("user_cosmetics").select("cosmetic_item_id").eq("user_id", user.id),
    supabase.from("users").select("xp").eq("id", user.id).single(),
    resolveEquippedCharacter(supabase, user.id),
  ]);

  const items = (catalog ?? []) as CosmeticItem[];
  const ownedIds = (ownedRows ?? []).map((r) => r.cosmetic_item_id as string);

  return NextResponse.json({
    items,
    ownedIds,
    equipped,
    xp: profile?.xp ?? 0,
  });
}
