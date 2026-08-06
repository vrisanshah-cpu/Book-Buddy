import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BOOSTER_DURATION_MS = 24 * 60 * 60 * 1000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: consumed } = await supabase.rpc("consume_shop_item", { p_item_code: "booster_2x_24h" });
  if (!consumed) {
    return NextResponse.json({ error: "You don't have a booster to activate" }, { status: 400 });
  }

  const activeUntil = new Date(Date.now() + BOOSTER_DURATION_MS).toISOString();
  const { error } = await supabase.from("users").update({ active_xp_booster_until: activeUntil }).eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, activeUntil });
}
