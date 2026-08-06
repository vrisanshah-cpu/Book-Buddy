import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await request.json();
  if (!["accept", "decline", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "accept") {
    // accept_trade_offer() (migration 020) does the whole swap atomically
    // and checks the caller is the receiver itself.
    const { error } = await supabase.rpc("accept_trade_offer", { p_trade_id: params.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const newStatus = action === "decline" ? "declined" : "cancelled";
  const matchColumn = action === "decline" ? "receiver_id" : "sender_id";

  const { error } = await supabase
    .from("trade_offers")
    .update({ status: newStatus })
    .eq("id", params.id)
    .eq(matchColumn, user.id)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
