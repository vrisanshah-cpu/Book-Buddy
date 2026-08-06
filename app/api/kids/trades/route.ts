import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: trades } = await supabase
    .from("trade_offers")
    .select(
      "id, sender_id, receiver_id, status, created_at, offered_item:shop_items!offered_item_id(id, name, icon_or_asset, rarity), requested_item:shop_items!requested_item_id(id, name, icon_or_asset, rarity), sender:users!sender_id(id, display_name), receiver:users!receiver_id(id, display_name)"
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return NextResponse.json({ trades: trades ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receiverId, offeredItemId, requestedItemId } = await request.json();
  if (!receiverId || !offeredItemId || !requestedItemId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (receiverId === user.id) {
    return NextResponse.json({ error: "You can't trade with yourself" }, { status: 400 });
  }

  const { data: owned } = await supabase
    .from("user_shop_items")
    .select("quantity")
    .eq("user_id", user.id)
    .eq("item_id", offeredItemId)
    .maybeSingle();

  if (!owned || owned.quantity < 1) {
    return NextResponse.json({ error: "You don't own the item you're offering" }, { status: 403 });
  }

  const { data: trade, error } = await supabase
    .from("trade_offers")
    .insert({ sender_id: user.id, receiver_id: receiverId, offered_item_id: offeredItemId, requested_item_id: requestedItemId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ trade });
}
