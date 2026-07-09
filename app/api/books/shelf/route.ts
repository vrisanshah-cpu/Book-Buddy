import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addToShelf, ensureBook } from "@/lib/books";
import type { BookStatus } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, author, cover_url, description, status, targetUserId } = body;

  if (!title || !author || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let shelfUserId = user.id;
  if (targetUserId && targetUserId !== user.id) {
    const { data: link } = await supabase
      .from("parent_child")
      .select("child_id")
      .eq("parent_id", user.id)
      .eq("child_id", targetUserId)
      .maybeSingle();
    if (!link) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    shelfUserId = targetUserId;
  }

  const bookId = await ensureBook(
    supabase,
    { title, author, cover_url, description },
    user.id
  );
  await addToShelf(supabase, shelfUserId, bookId, status as BookStatus);

  return NextResponse.json({ bookId, success: true });
}
