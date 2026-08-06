import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateThemeForItemName } from "@/lib/ai-theme";

type SlotType = "badge" | "title";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, itemId } = (await request.json()) as { type: SlotType; itemId: string | null };
  if (type !== "badge" && type !== "title") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const column = type === "badge" ? "equipped_badge_id" : "equipped_title_id";

  if (itemId === null) {
    const { error } = await supabase.from("users").update({ [column]: null }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  let itemName: string | undefined;
  let itemRarity: string | undefined;

  if (type === "badge") {
    const { data: owned } = await supabase
      .from("user_badges")
      .select("badge:badges(id, name, rarity)")
      .eq("user_id", user.id)
      .eq("badge_id", itemId)
      .maybeSingle();
    if (!owned) return NextResponse.json({ error: "You don't own that badge" }, { status: 403 });
    const badge = Array.isArray(owned.badge) ? owned.badge[0] : owned.badge;
    itemName = badge?.name;
    itemRarity = badge?.rarity;
  } else {
    const { data: owned } = await supabase
      .from("user_titles")
      .select("title:titles(id, name, rarity)")
      .eq("user_id", user.id)
      .eq("title_id", itemId)
      .maybeSingle();
    if (!owned) return NextResponse.json({ error: "You don't own that title" }, { status: 403 });
    const title = Array.isArray(owned.title) ? owned.title[0] : owned.title;
    itemName = title?.name;
    itemRarity = title?.rarity;
  }

  const theme = await generateThemeForItemName(itemName ?? type, itemRarity);

  const { error } = await supabase
    .from("users")
    .update({ [column]: itemId, active_theme_config: theme })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, theme });
}
