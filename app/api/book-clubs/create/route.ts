import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureBook } from "@/lib/books";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, book, memberIds } = await request.json();

  let bookId: string | null = null;
  if (book?.title) {
    bookId = await ensureBook(supabase, book, user.id);
  }

  const { data: club, error } = await supabase
    .from("book_clubs")
    .insert({
      name,
      description,
      current_book_id: bookId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 1. Create a regular array with the user ID and other member IDs
  const allMembers = [user.id, ...(memberIds ?? [])];
  
  // 2. Filter out duplicates cleanly
  const uniqueMembers = allMembers.filter((value, index, self) => self.indexOf(value) === index);

  await supabase.from("book_club_members").insert(
    uniqueMembers.map((uid) => ({
      club_id: club.id,
      user_id: uid,
    }))
  );

  return NextResponse.json({ club });
}
