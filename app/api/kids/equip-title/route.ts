import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { titleId } = await request.json();

  if (titleId !== null) {
    if (typeof titleId !== "string") {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    // Explicit ownership check. RLS on user_titles already scopes reads to
    // the caller's own rows, but users_update_own on the `users` table only
    // checks id = auth.uid() — it would otherwise let someone equip a title
    // they never earned. Checking here is the actual enforcement.
    const { data: owned, error: ownedError } = await supabase
      .from("user_titles")
      .select("title_id")
      .eq("user_id", user.id)
      .eq("title_id", titleId)
      .maybeSingle();

    if (ownedError) {
      return NextResponse.json({ error: ownedError.message }, { status: 500 });
    }
    if (!owned) {
      return NextResponse.json({ error: "You haven't earned that title yet" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("users").update({ equipped_title_id: titleId }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}