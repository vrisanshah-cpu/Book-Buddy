import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { containsProfanity } from "@/lib/profanity-filter";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nickname, optIn } = await request.json();

  if (!optIn) {
    const { error } = await supabase
      .from("users")
      .update({ leaderboard_opt_in: false })
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const trimmed = String(nickname ?? "").trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    return NextResponse.json({ error: "Nickname must be 2-20 characters" }, { status: 400 });
  }

  if (containsProfanity(trimmed)) {
    return NextResponse.json(
      { error: "That nickname isn't allowed — try something else!" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("users")
    .update({ leaderboard_nickname: trimmed, leaderboard_opt_in: true })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}