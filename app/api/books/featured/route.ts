import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureBook } from "@/lib/books";

async function requireTeacherOfClassroom(classroomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!classroom) {
    return { error: NextResponse.json({ error: "Not your classroom" }, { status: 403 }) };
  }
  return { supabase, user };
}

// Now returns site-wide admin_featured books, not the old flat
// books.featured — kids' Discover calls this for "Featured by Book Buddy".
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, author, cover_url, description")
    .eq("admin_featured", true)
    .limit(12);
  return NextResponse.json({ books: data ?? [] });
}

export async function POST(request: Request) {
  const { bookId, classroomId, featured } = await request.json();
  const ctx = await requireTeacherOfClassroom(classroomId);
  if ("error" in ctx) return ctx.error;
  const { supabase } = ctx;

  if (featured === false) {
    const { error } = await supabase
      .from("classroom_featured_books")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("book_id", bookId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("classroom_featured_books")
    .upsert({ classroom_id: classroomId, book_id: bookId, featured_by: ctx.user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const { title, author, cover_url, description, classroomId } = await request.json();
  const ctx = await requireTeacherOfClassroom(classroomId);
  if ("error" in ctx) return ctx.error;
  const { supabase, user } = ctx;

  const bookId = await ensureBook(supabase, { title, author, cover_url, description }, user.id);
  const { error } = await supabase
    .from("classroom_featured_books")
    .upsert({ classroom_id: classroomId, book_id: bookId, featured_by: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, bookId });
}