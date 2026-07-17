import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { data, error } = await supabase
    .from("admin_posts")
    .select("id, admin_id, type, title, body, video_url, cover_image_url, pinned, published_at")
    .order("published_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { type, title, body, video_url, cover_image_url, pinned } = await request.json();
  if (!title?.trim() || !body?.trim() || (type !== "blog" && type !== "video")) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("admin_posts")
    .insert({
      admin_id: user.id,
      type,
      title: title.trim(),
      body: body.trim(),
      video_url: video_url?.trim() || null,
      cover_image_url: cover_image_url?.trim() || null,
      pinned: Boolean(pinned),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing post id" }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  for (const key of ["type", "title", "body", "video_url", "cover_image_url", "pinned"]) {
    if (key in updates) allowed[key] = updates[key];
  }

  const { data, error } = await supabase
    .from("admin_posts")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing post id" }, { status: 400 });

  const { error } = await supabase.from("admin_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}