"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Filter = "all" | "classroom" | "clubs";

interface Post {
  id: string;
  content: string;
  likes: number;
  created_at: string;
  user_id: string;
  book: { title: string; author: string; cover_url: string | null };
  author: { display_name: string; avatar_url: string | null };
}

export function BookTokClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showShare, setShowShare] = useState(false);
  const [myBooks, setMyBooks] = useState<{ book_id: string; book: { id: string; title: string } }[]>([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [review, setReview] = useState("");

  const load = useCallback(async () => {
    let userFilter: string[] | null = null;
    if (filter === "classroom") {
      const { data: myClass } = await supabase
        .from("teacher_student")
        .select("classroom_id")
        .eq("student_id", userId)
        .limit(1)
        .maybeSingle();
      if (myClass?.classroom_id) {
        const { data: classRows } = await supabase
          .from("teacher_student")
          .select("student_id")
          .eq("classroom_id", myClass.classroom_id);
        userFilter = classRows?.map((r) => r.student_id) ?? [];
      }
    }

    let query = supabase
      .from("booktok_posts")
      .select(
        "id, content, likes, created_at, user_id, book:books(title, author, cover_url), users!booktok_posts_user_id_fkey(display_name, avatar_url)"
      )
      .order("likes", { ascending: false })
      .limit(50);

    if (userFilter?.length) query = query.in("user_id", userFilter);

    const { data } = await query;
    const mapped = (data ?? []).map((row) => {
      const bookData = Array.isArray(row.book) ? row.book[0] : row.book;
      const usersData = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        ...row,
        book: bookData as Post["book"],
        author: usersData as Post["author"],
      };
    });
    setPosts(mapped as Post[]);

    const { data: likes } = await supabase
      .from("booktok_likes")
      .select("post_id")
      .eq("user_id", userId);
    setLikedIds(new Set((likes ?? []).map((l) => l.post_id)));
  }, [supabase, userId, filter]);

  useEffect(() => {
    load();
    supabase
    .from("user_books")
    .select("book_id, book:books(id, title)")
    .eq("user_id", userId)
    .then(({ data }) => {
      const normalized = (data ?? []).map((row) => ({
        book_id: row.book_id,
        book: (Array.isArray(row.book) ? row.book[0] : row.book) as { id: string; title: string },
      }));
      setMyBooks(normalized);
    });
  }, [load, supabase, userId]);

  async function toggleLike(postId: string) {
    const liked = likedIds.has(postId);
    await fetch("/api/booktok/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, liked: !liked }),
    });
    const next = new Set(likedIds);
    if (liked) next.delete(postId);
    else next.add(postId);
    setLikedIds(next);
    load();
  }

  async function sharePost() {
    if (!selectedBook || !review.trim()) return;
    await fetch("/api/booktok/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: selectedBook, content: review }),
    });
    setShowShare(false);
    setReview("");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-kids-display text-3xl font-bold">BookTok</h1>
        <Button variant="kids" onClick={() => setShowShare(true)}>
          Share a book
        </Button>
      </div>

      <div className="mt-4 flex gap-2">
        {(["all", "classroom"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold capitalize ${
              filter === f ? "bg-kids-purple text-white" : "bg-white"
            }`}
          >
            {f === "all" ? "All" : "My Classroom"}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="snap-start rounded-2xl bg-white p-5 shadow-lg"
          >
            <div className="flex gap-4">
              {post.book?.cover_url && (
                <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={post.book.cover_url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div>
                <p className="font-bold">{post.book?.title}</p>
                <p className="text-sm text-slate-500">{post.book?.author}</p>
                <p className="mt-2 text-slate-700">{post.content}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {post.author?.display_name ?? "Reader"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleLike(post.id)}
              className={`mt-3 text-lg ${likedIds.has(post.id) ? "text-red-500" : "text-slate-400"}`}
            >
              {likedIds.has(post.id) ? "❤️" : "🤍"} {post.likes}
            </button>
          </div>
        ))}
      </div>

      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-xl font-bold">Share a book</h2>
            <select
              className="mt-4 w-full rounded-xl border px-4 py-2"
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
            >
              <option value="">Pick from your shelf</option>
              {myBooks.map((ub) => (
                <option key={ub.book.id} value={ub.book.id}>
                  {ub.book.title}
                </option>
              ))}
            </select>
            <textarea
              className="mt-3 w-full rounded-xl border p-3 text-sm"
              rows={4}
              placeholder="Why do you love this book?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setShowShare(false)}>
                Cancel
              </Button>
              <Button variant="kids" fullWidth onClick={sharePost}>
                Post (+15 XP)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
