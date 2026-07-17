"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Filter = "all" | "classroom";

interface Post {
  id: string;
  content: string;
  likes: number;
  created_at: string;
  user_id: string;
  book: { title: string; author: string; cover_url: string | null };
  author: { display_name: string; avatar_url: string | null };
}

interface AdminPost {
  id: string;
  type: "blog" | "video";
  title: string;
  body: string;
  video_url: string | null;
  cover_image_url: string | null;
  pinned: boolean;
  published_at: string;
}

interface BookMatch {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

interface AdminPostMatch {
  id: string;
  type: "blog" | "video";
  title: string;
}

interface SearchResults {
  posts: Post[];
  books: BookMatch[];
  adminPosts: AdminPostMatch[];
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function PostCard({
  post,
  liked,
  onToggleLike,
}: {
  post: Post;
  liked: boolean;
  onToggleLike: () => void;
}) {
  return (
    <div className="snap-start rounded-2xl bg-white p-5 shadow-lg">
      <div className="flex gap-4">
        {post.book?.cover_url && (
          <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-lg">
            <Image src={post.book.cover_url} alt="" fill className="object-cover" unoptimized />
          </div>
        )}
        <div>
          <p className="font-bold">{post.book?.title}</p>
          <p className="text-sm text-slate-500">{post.book?.author}</p>
          <p className="mt-2 text-slate-700">{post.content}</p>
          <p className="mt-2 text-xs text-slate-400">{post.author?.display_name ?? "Reader"}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleLike}
        className={`mt-3 text-lg ${liked ? "text-red-500" : "text-slate-400"}`}
      >
        {liked ? "❤️" : "🤍"} {post.likes}
      </button>
    </div>
  );
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
  const [feedError, setFeedError] = useState("");

  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

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

    const { data, error } = await query;
    if (error) {
      setFeedError("Couldn't load the feed — try refreshing.");
      return;
    }
    setFeedError("");
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

  useEffect(() => {
    supabase
      .from("admin_posts")
      .select("id, type, title, body, video_url, cover_image_url, pinned, published_at")
      .eq("pinned", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => setAdminPosts((data ?? []) as AdminPost[]));
  }, [supabase]);

  async function toggleLike(postId: string) {
    const liked = likedIds.has(postId);
    const res = await fetch("/api/booktok/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, liked: !liked }),
    });
    if (!res.ok) {
      alert("Couldn't update that like — try again.");
      return;
    }
    const next = new Set(likedIds);
    if (liked) next.delete(postId);
    else next.add(postId);
    setLikedIds(next);
    load();
  }

  async function sharePost() {
    if (!selectedBook || !review.trim()) return;
    const res = await fetch("/api/booktok/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: selectedBook, content: review }),
    });
    if (!res.ok) {
      alert("Couldn't share that post — try again.");
      return;
    }
    setShowShare(false);
    setReview("");
    load();
  }

  async function runSearch() {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    setSearchError("");
    const res = await fetch(`/api/booktok/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearching(false);
    if (!res.ok) {
      setSearchError("Search didn't work — try again.");
      return;
    }
    const data = await res.json();
    setSearchResults(data);
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
    setSearchError("");
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
        <Input
          placeholder="Search posts, books, authors…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <Button variant="secondary" onClick={runSearch} disabled={searching}>
          {searching ? "…" : "Search"}
        </Button>
        {searchResults && (
          <Button variant="ghost" onClick={clearSearch}>
            Clear
          </Button>
        )}
      </div>
      {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}

      {searchResults ? (
        <div className="mt-6 space-y-8">
          <div>
            <h2 className="font-bold text-slate-800">Posts</h2>
            <div className="mt-3 space-y-4">
              {searchResults.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={likedIds.has(post.id)}
                  onToggleLike={() => toggleLike(post.id)}
                />
              ))}
              {searchResults.posts.length === 0 && (
                <p className="text-sm text-slate-500">No posts match &quot;{searchQuery}&quot;.</p>
              )}
            </div>
          </div>

          {searchResults.books.length > 0 && (
            <div>
              <h2 className="font-bold text-slate-800">Books</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {searchResults.books.map((b) => (
                  <div key={b.id} className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="font-semibold">{b.title}</p>
                    <p className="text-sm text-slate-500">{b.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.adminPosts.length > 0 && (
            <div>
              <h2 className="font-bold text-slate-800">From Book Buddy</h2>
              <div className="mt-3 space-y-2">
                {searchResults.adminPosts.map((p) => (
                  <div key={p.id} className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{p.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {adminPosts.length > 0 && (
            <div className="mt-4 space-y-3">
              {adminPosts.map((p) => {
                const embedUrl = p.type === "video" && p.video_url ? toEmbedUrl(p.video_url) : null;
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border-2 border-kids-yellow bg-gradient-to-r from-violet-50 to-amber-50 p-5 shadow-md"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-kids-purple">📌 From Book Buddy</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{p.title}</p>
                    {embedUrl ? (
                      <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl">
                        <iframe src={embedUrl} className="h-full w-full" allowFullScreen title={p.title} />
                      </div>
                    ) : (
                      p.cover_image_url && (
                        <div className="relative mt-3 h-40 w-full overflow-hidden rounded-xl">
                          <Image src={p.cover_image_url} alt="" fill className="object-cover" unoptimized />
                        </div>
                      )
                    )}
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{p.body}</p>
                  </div>
                );
              })}
            </div>
          )}

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

          {feedError && <p className="mt-3 text-sm text-red-600">{feedError}</p>}

          <div className="mt-6 space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={likedIds.has(post.id)}
                onToggleLike={() => toggleLike(post.id)}
              />
            ))}
          </div>
        </>
      )}

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