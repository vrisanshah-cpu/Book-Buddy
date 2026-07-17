import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId, liked } = await request.json();

  if (liked) {
    await supabase.from("booktok_likes").upsert({
      post_id: postId,
      user_id: user.id,
    });
    await supabase.rpc("adjust_booktok_likes", { p_post_id: postId, p_delta: 1 });
  } else {
    await supabase
      .from("booktok_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    await supabase.rpc("adjust_booktok_likes", { p_post_id: postId, p_delta: -1 });
  }

  return NextResponse.json({ success: true });
}