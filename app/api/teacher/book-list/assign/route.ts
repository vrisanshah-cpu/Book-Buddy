import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addToShelf, ensureBook } from "@/lib/books";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId, classroomId } = await request.json();

  const { data: items } = await supabase
    .from("book_list_items")
    .select("book_id, book:books(title, author, cover_url, description)")
    .eq("list_id", listId);

  const { data: students } = await supabase
    .from("teacher_student")
    .select("student_id")
    .eq("teacher_id", user.id)
    .eq("classroom_id", classroomId);

  for (const student of students ?? []) {
    for (const item of items ?? []) {
      const bookData = Array.isArray(item.book) ? item.book[0] : item.book;
      const book = bookData as {
        title: string;
        author: string;
        cover_url: string | null;
        description: string | null;
      };
      const bookId = await ensureBook(
        supabase,
        {
          title: book.title,
          author: book.author,
          cover_url: book.cover_url,
          description: book.description ?? undefined,
        },
        user.id
      );
      await addToShelf(supabase, student.student_id, bookId, "want_to_read");
    }
  }

  return NextResponse.json({ assigned: (students ?? []).length });
}
