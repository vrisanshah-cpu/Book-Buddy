import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addToShelf, ensureBook } from "@/lib/books";
import { getEffectiveBlocksForKid, isBookBlocked } from "@/lib/content-blocks";
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

  // Self case: RLS already scopes getEffectiveBlocksForKid correctly via
  // `supabase`. Parent-for-child case (targetUserId branch above) is a
  // cross-user read, so use the admin client per this project's rule for
  // cross-user writes/reads on behalf of a student/child.
  const blocksClient = shelfUserId === user.id ? supabase : createAdminClient();
  const blocks = await getEffectiveBlocksForKid(blocksClient, shelfUserId);
  if (isBookBlocked(blocks, { title, author })) {
    return NextResponse.json(
      { error: "This book is blocked by a content setting from a parent or teacher." },
      { status: 403 }
    );
  }

  try {
    const bookId = await ensureBook(
      supabase,
      { title, author, cover_url, description },
      user.id
    );
    await addToShelf(supabase, shelfUserId, bookId, status as BookStatus);
    return NextResponse.json({ bookId, success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}