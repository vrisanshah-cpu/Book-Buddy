import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().slice(0, 100);
  if (!q) return NextResponse.json({ posts: [], books: [], adminPosts: [] });

  const like = `%${q}%`;

  const [postsRes, titleRes, authorRes, adminRes] = await Promise.all([
    supabase
      .from("booktok_posts")
      .select(
        "id, content, likes, created_at, user_id, book:books(title, author, cover_url), users!booktok_posts_user_id_fkey(display_name, avatar_url)"
      )
      .ilike("content", like)
      .order("likes", { ascending: false })
      .limit(30),
    supabase.from("books").select("id, title, author, cover_url").ilike("title", like).limit(10),
    supabase.from("books").select("id, title, author, cover_url").ilike("author", like).limit(10),
    supabase.from("admin_posts").select("id, type, title").ilike("title", like).limit(10),
  ]);

  if (postsRes.error) {
    return NextResponse.json({ error: postsRes.error.message }, { status: 500 });
  }

  const posts = (postsRes.data ?? []).map((row) => {
    const bookData = Array.isArray(row.book) ? row.book[0] : row.book;
    const usersData = Array.isArray(row.users) ? row.users[0] : row.users;
    return { ...row, book: bookData, author: usersData };
  });

  const bookMap = new Map<string, { id: string; title: string; author: string; cover_url: string | null }>();
  for (const b of [...(titleRes.data ?? []), ...(authorRes.data ?? [])]) {
    bookMap.set(b.id, b);
  }

  return NextResponse.json({
    posts,
    books: Array.from(bookMap.values()),
    adminPosts: adminRes.data ?? [],
  });
}