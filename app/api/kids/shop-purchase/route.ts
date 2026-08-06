import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purchaseShopItem } from "@/lib/xp-sinks";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemCode } = await request.json();
  if (!itemCode) return NextResponse.json({ error: "Missing itemCode" }, { status: 400 });

  const result = await purchaseShopItem(supabase, user.id, itemCode);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, newXp: result.newXp });
}
