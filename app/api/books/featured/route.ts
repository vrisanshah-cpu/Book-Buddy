import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureBook } from "@/lib/books";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let classroomId = searchParams.get("classroomId");

  if (!classroomId) {
    // No classroomId given — assume the caller is a kid and resolve their own classroom.
    const { data: link } = await supabase
      .from("teacher_student")
      .select("classroom_id")
      .eq("student_id", user.id)
      .not("classroom_id", "is", null)
      .limit(1)
      .maybeSingle();
    classroomId = link?.classroom_id ?? null;
  }

  if (!classroomId) {
    return NextResponse.json({ books: [], classroomId: null });
  }

  const { data, error } = await supabase
    .from("classroom_featured_books")
    .select("book_id, book:books(id, title, author, cover_url, description)")
    .eq("classroom_id", classroomId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const books = (data ?? [])
    .map((row) => (Array.isArray(row.book) ? row.book[0] : row.book))
    .filter(Boolean);

  return NextResponse.json({ books, classroomId });
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

  const { bookId, classroomId } = await request.json();
  if (!bookId || !classroomId) {
    return NextResponse.json({ error: "Missing bookId or classroomId" }, { status: 400 });
  }

  const { error } = await supabase
    .from("classroom_featured_books")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("book_id", bookId);

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

  const { title, author, cover_url, description, classroomId } = await request.json();
  if (!classroomId) {
    return NextResponse.json({ error: "Missing classroomId" }, { status: 400 });
  }

  const bookId = await ensureBook(supabase, { title, author, cover_url, description }, user.id);

  const { error } = await supabase
    .from("classroom_featured_books")
    .upsert(
      { classroom_id: classroomId, book_id: bookId, featured_by: user.id },
      { onConflict: "classroom_id,book_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, bookId });
}