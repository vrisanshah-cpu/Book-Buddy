import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purchaseCosmeticItem } from "@/lib/xp-sinks";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await request.json();
  if (!itemId) return NextResponse.json({ error: "Missing itemId" }, { status: 400 });

  const result = await purchaseCosmeticItem(supabase, user.id, itemId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, newXp: result.newXp });
}
