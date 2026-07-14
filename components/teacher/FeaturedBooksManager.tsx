"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { searchOpenLibrary, type OpenLibraryBook } from "@/lib/open-library";

export function FeaturedBooksManager() {
  const supabase = createClient();
  const [featured, setFeatured] = useState<{ id: string; title: string; author: string }[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenLibraryBook[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from("books").select("id, title, author").eq("featured", true);
    setFeatured(data ?? []);
  }

  async function search() {
    setResults(await searchOpenLibrary(query));
  }

  async function feature(book: OpenLibraryBook) {
    const res = await fetch("/api/books/featured", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });
    if (res.ok) load();
  }

  async function unfeature(bookId: string) {
    await fetch("/api/books/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, featured: false }),
    });
    load();
  }

  return (
    <div className="mt-10 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold">Featured books (shown on kids' Discover page)</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {featured.map((b) => (
          <span key={b.id} className="flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm">
            {b.title}
            <button type="button" onClick={() => unfeature(b.id)} className="text-slate-500 hover:text-red-500">
              ✕
            </button>
          </span>
        ))}
        {featured.length === 0 && <p className="text-sm text-slate-500">No featured books yet.</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <Input placeholder="Search a book to feature…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button variant="secondary" onClick={search}>Search</Button>
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