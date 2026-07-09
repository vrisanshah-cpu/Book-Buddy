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
    const { data: post } = await supabase
      .from("booktok_posts")
      .select("likes")
      .eq("id", postId)
      .single();
    await supabase
      .from("booktok_posts")
      .update({ likes: (post?.likes ?? 0) + 1 })
      .eq("id", postId);
  } else {
    await supabase
      .from("booktok_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    const { data: post } = await supabase
      .from("booktok_posts")
      .select("likes")
      .eq("id", postId)
      .single();
    await supabase
      .from("booktok_posts")
      .update({ likes: Math.max(0, (post?.likes ?? 1) - 1) })
      .eq("id", postId);
  }

  return NextResponse.json({ success: true });
}
