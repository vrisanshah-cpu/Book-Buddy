"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { searchByAuthor } from "@/lib/open-library";

interface Rec {
  title: string;
  author: string;
  why: string;
}

interface FeaturedBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
}

interface AuthorBook {
  title: string;
  author: string;
  cover_url: string | null;
}

function WhereToFind({ title, author }: { title: string; author: string }) {
  const q = encodeURIComponent(`${title} ${author}`);
  return (
    <div className="mt-2 flex gap-3 text-xs">
      <a href={`https://bookshop.org/beta-search?keywords=${q}`} target="_blank" rel="noreferrer" className="text-kids-purple underline">
        Buy it
      </a>
      <a href={`https://search.worldcat.org/search?q=${q}`} target="_blank" rel="noreferrer" className="text-kids-purple underline">
        Find at a library
      </a>
    </div>
  );
}

function BookCard({
  book,
  added,
  onAdd,
}: {
  book: { title: string; author: string; description?: string | null };
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-md">
      <p className="font-bold">{book.title}</p>
      <p className="text-sm text-slate-500">{book.author}</p>
      {book.description && <p className="mt-2 text-sm text-slate-600 line-clamp-2">{book.description}</p>}
      <WhereToFind title={book.title} author={book.author} />
      <Button variant="secondary" className="mt-3 !text-xs" onClick={onAdd} disabled={added}>
        {added ? "Added ✓" : "+ Want to read"}
      </Button>
    </div>
  );
}

export function DiscoverClient() {
  const supabase = createClient();
  const [tab, setTab] = useState<"recommended" | "featured" | "author">("recommended");

  const [recs, setRecs] = useState<Rec[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState("");
  const [locked, setLocked] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const [siteFeatured, setSiteFeatured] = useState<FeaturedBook[]>([]);
  const [classroomFeatured, setClassroomFeatured] = useState<FeaturedBook[]>([]);
  const [inClassroom, setInClassroom] = useState(false);
  const [loadedFeatured, setLoadedFeatured] = useState(false);

  const [authorQuery, setAuthorQuery] = useState("");
  const [authorResults, setAuthorResults] = useState<AuthorBook[]>([]);
  const [searchingAuthor, setSearchingAuthor] = useState(false);

  async function loadRecs() {
    setLoadingRecs(true);
    setRecError("");
    const res = await fetch("/api/books/recommend", { method: "POST" });
    const data = await res.json();
    setLoadingRecs(false);
    if (data.locked) {
      setLocked(true);
      return;
    }
    if (res.ok) {
      setRecs(data.recommendations ?? []);
    } else {
      setRecError(data.error ?? "Something went wrong.");
    }
  }

  async function loadFeatured() {
    const siteRes = await fetch("/api/books/featured");
    const siteData = await siteRes.json();
    setSiteFeatured(siteData.books ?? []);

    const { data: link } = await supabase
      .from("teacher_student")
      .select("classroom_id")
      .not("classroom_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (link?.classroom_id) {
      setInClassroom(true);
      const { data } = await supabase
        .from("classroom_featured_books")
        .select("book_id, book:books(id, title, author, cover_url, description)")
        .eq("classroom_id", link.classroom_id);
      setClassroomFeatured(
        (data ?? [])
          .map((r) => (Array.isArray(r.book) ? r.book[0] : r.book))
          .filter((b): b is FeaturedBook => Boolean(b))
      );
    } else {
      setInClassroom(false);
      setClassroomFeatured([]);
    }

    setLoadedFeatured(true);
  }

  async function addToWantToRead(title: string, author: string) {
    const res = await fetch("/api/books/shelf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, author, status: "want_to_read" }),
    });
    if (res.ok) setAdded((a) => new Set(a).add(title));
  }

  async function searchAuthor() {
    if (!authorQuery.trim()) return;
    setSearchingAuthor(true);
    setAuthorResults(await searchByAuthor(authorQuery.trim()));
    setSearchingAuthor(false);
  }

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Discover</h1>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("recommended")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "recommended" ? "bg-kids-purple text-white" : "bg-violet-50 text-slate-600"}`}
        >
          Recommended
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("featured");
            if (!loadedFeatured) loadFeatured();
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "featured" ? "bg-kids-purple text-white" : "bg-violet-50 text-slate-600"}`}
        >
          Featured
        </button>
        <button
          type="button"
          onClick={() => setTab("author")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "author" ? "bg-kids-purple text-white" : "bg-violet-50 text-slate-600"}`}
        >
          Search by author
        </button>
      </div>

      {tab === "recommended" && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Recommended for you</h2>
            <Button variant="kids" className="!text-xs" onClick={loadRecs} disabled={loadingRecs}>
              {loadingRecs ? "Thinking…" : recs.length ? "Refresh" : "Get recommendations"}
            </Button>
          </div>

          {recError && <p className="mt-3 text-sm text-red-600">{recError}</p>}
          {locked && (
            <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-slate-600">
              Ask a grown-up to subscribe in Settings to unlock recommendations! 🔒
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recs.map((r) => (
              <BookCard key={r.title} book={{ ...r, description: r.why }} added={added.has(r.title)} onAdd={() => addToWantToRead(r.title, r.author)} />
            ))}
          </div>
        </section>
      )}

      {tab === "featured" && (
        <section className="mt-6 space-y-8">
          <div>
            <h2 className="font-bold text-slate-800">Featured by Book Buddy</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {siteFeatured.map((b) => (
                <BookCard key={b.id} book={b} added={added.has(b.title)} onAdd={() => addToWantToRead(b.title, b.author)} />
              ))}
              {siteFeatured.length === 0 && <p className="text-slate-500">No site-wide featured books yet — check back soon!</p>}
            </div>
          </div>

          {inClassroom && (
            <div>
              <h2 className="font-bold text-slate-800">Featured by your teacher</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {classroomFeatured.map((b) => (
                  <BookCard key={b.id} book={b} added={added.has(b.title)} onAdd={() => addToWantToRead(b.title, b.author)} />
                ))}
                {classroomFeatured.length === 0 && <p className="text-slate-500">No featured books yet — check back soon!</p>}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "author" && (
        <section className="mt-6">
          <h2 className="font-bold text-slate-800">Search by author</h2>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Author name…"
              value={authorQuery}
              onChange={(e) => setAuthorQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAuthor()}
            />
            <Button variant="secondary" onClick={searchAuthor} disabled={searchingAuthor}>
              {searchingAuthor ? "…" : "Search"}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {authorResults.map((b, i) => (
              <BookCard key={`${b.title}-${i}`} book={b} added={added.has(b.title)} onAdd={() => addToWantToRead(b.title, b.author)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}