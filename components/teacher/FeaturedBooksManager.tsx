"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { searchOpenLibrary, type OpenLibraryBook } from "@/lib/open-library";

interface FeaturedRow {
  book_id: string;
  title: string;
  author: string;
}

export function FeaturedBooksManager({ classrooms }: { classrooms: { id: string; name: string }[] }) {
  const supabase = createClient();
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? "");
  const [featured, setFeatured] = useState<FeaturedRow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenLibraryBook[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (classroomId) load(classroomId);
  }, [classroomId]);

  async function load(id: string) {
    const { data } = await supabase
      .from("classroom_featured_books")
      .select("book_id, book:books(title, author)")
      .eq("classroom_id", id);
    setFeatured(
      (data ?? []).map((r) => {
        const b = Array.isArray(r.book) ? r.book[0] : r.book;
        return { book_id: r.book_id as string, title: b?.title ?? "", author: b?.author ?? "" };
      })
    );
  }

  async function search() {
    setResults(await searchOpenLibrary(query));
  }

  async function feature(book: OpenLibraryBook) {
    setError("");
    if (!classroomId) {
      setError("Create a classroom first.");
      return;
    }
    const res = await fetch("/api/books/featured", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...book, classroomId }),
    });
    if (res.ok) {
      load(classroomId);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't feature that book.");
    }
  }

  async function unfeature(bookId: string) {
    await fetch("/api/books/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, classroomId, featured: false }),
    });
    load(classroomId);
  }

  return (
    <div className="mt-10 rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Featured books (shown to your class on Discover)</h2>
        {classrooms.length > 1 && (
          <select
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {classrooms.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">Create a classroom above to feature books for your students.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {featured.map((b) => (
          <span key={b.book_id} className="flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm">
            {b.title}
            <button type="button" onClick={() => unfeature(b.book_id)} className="text-slate-500 hover:text-red-500">
              ✕
            </button>
          </span>
        ))}
        {featured.length === 0 && classrooms.length > 0 && <p className="text-sm text-slate-500">No featured books yet.</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <Input placeholder="Search a book to feature…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button variant="secondary" onClick={search}>
          Search
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {results.map((b, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-sm text-slate-500">{b.author}</p>
            </div>
            <Button variant="primary" className="!text-xs" onClick={() => feature(b)}>
              Feature
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}