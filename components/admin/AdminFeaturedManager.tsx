"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { searchOpenLibrary, type OpenLibraryBook } from "@/lib/open-library";

export function AdminFeaturedManager() {
  const [featured, setFeatured] = useState<{ id: string; title: string; author: string }[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenLibraryBook[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/admin/featured");
    if (!res.ok) {
      setError("Couldn't load featured books.");
      return;
    }
    const data = await res.json();
    setFeatured(data.books ?? []);
  }

  async function search() {
    setResults(await searchOpenLibrary(query));
  }

  async function feature(book: OpenLibraryBook) {
    const res = await fetch("/api/admin/featured", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });
    if (res.ok) {
      setError("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't feature that book.");
    }
  }

  async function unfeature(bookId: string) {
    const res = await fetch("/api/admin/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, featured: false }),
    });
    if (res.ok) {
      setError("");
      load();
    } else {
      setError("Couldn't unfeature that book.");
    }
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Featured Books</h1>
      <p className="mt-1 text-sm text-slate-500">
        Shown as &quot;Featured by Book Buddy&quot; to every kid, and on the logged-out landing page.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {featured.map((b) => (
          <span key={b.id} className="flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm">
            {b.title}
            <button type="button" onClick={() => unfeature(b.id)} className="text-slate-500 hover:text-red-500">
              ✕
            </button>
          </span>
        ))}
        {featured.length === 0 && <p className="text-sm text-slate-500">No site-wide featured books yet.</p>}
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