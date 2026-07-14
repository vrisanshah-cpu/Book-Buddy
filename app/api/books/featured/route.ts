import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureBook } from "@/lib/books";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, author, cover_url, description")
    .eq("featured", true)
    .limit(12);
  return NextResponse.json({ books: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "teacher") {
    return NextResponse.json({ error: "Only teachers can feature books" }, { status: 403 });
  }

  const { bookId, featured } = await request.json();
  const { error } = await supabase.from("books").update({ featured }).eq("id", bookId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "teacher") {
    return NextResponse.json({ error: "Only teachers can feature books" }, { status: 403 });
  }

  const { title, author, cover_url, description } = await request.json();
  const bookId = await ensureBook(supabase, { title, author, cover_url, description }, user.id);
  const { error } = await supabase.from("books").update({ featured: true }).eq("id", bookId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, bookId });
}