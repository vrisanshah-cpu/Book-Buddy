import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureBook } from "@/lib/books";

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, book, isPrivate } = await request.json();

  let bookId: string | null = null;
  if (book?.title) {
    bookId = await ensureBook(supabase, book, user.id);
  }

  const inviteCode = isPrivate ? generateInviteCode() : null;

  const { data: club, error } = await supabase
    .from("book_clubs")
    .insert({
      name,
      description,
      current_book_id: bookId,
      created_by: user.id,
      is_private: Boolean(isPrivate),
      invite_code: inviteCode,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("book_club_members").insert({
    club_id: club.id,
    user_id: user.id,
  });

  return NextResponse.json({ club });
}