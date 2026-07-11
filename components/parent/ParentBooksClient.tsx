"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchOpenLibrary, type OpenLibraryBook } from "@/lib/open-library";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  collectParentChildProfiles,
  type ParentChildProfileData,
} from "@/components/parent/ParentChildProfile";

interface ShelfItem {
  id: string;
  status: string;
  progress_percent: number;
  book: { title: string; author: string };
}

export function ParentBooksClient({ children }: { children?: ReactNode }) {
  const linkedChildren = collectParentChildProfiles(children);
  const supabase = createClient();
  const [selectedChild, setSelectedChild] = useState(linkedChildren[0]?.id ?? "");
  const [shelf, setShelf] = useState<ShelfItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenLibraryBook[]>([]);

  useEffect(() => {
    if (!selectedChild) return;
    supabase
      .from("user_books")
      .select("id, status, progress_percent, book:books(title, author)")
      .eq("user_id", selectedChild)
      .then(({ data }) => setShelf((data as unknown as ShelfItem[]) ?? []));
  }, [selectedChild, supabase]);

  async function search() {
    const r = await searchOpenLibrary(query);
    setResults(r);
  }

async function addBook(book: OpenLibraryBook, status: string) {
  const res = await fetch("/api/books/shelf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...book, status, targetUserId: selectedChild }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert("Failed to add book: " + (data.error ?? res.status));
    return;
  }
  const { data } = await supabase
    .from("user_books")
    .select("id, status, progress_percent, book:books(title, author)")
    .eq("user_id", selectedChild);
  setShelf((data as unknown as ShelfItem[]) ?? []);
}

  const selectedProfile = linkedChildren.find(
    (c: ParentChildProfileData) => c.id === selectedChild
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Books</h1>
      <p className="mt-1 text-parent-muted">
        Search and add books to your child&apos;s shelf.
      </p>

      <select
        className="mt-4 rounded-lg border px-4 py-2"
        value={selectedChild}
        onChange={(e) => setSelectedChild(e.target.value)}
      >
        {linkedChildren.map((c) => (
          <option key={c.id} value={c.id}>
            {c.display_name}
          </option>
        ))}
      </select>

      <div className="mt-6 flex gap-2">
        <Input
          placeholder="Search Open Library…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="primary" onClick={search}>
          Search
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {results.map((b, i) => (
          <div key={i} className="flex justify-between rounded-lg bg-white p-3 shadow-sm">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-sm text-slate-500">{b.author}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="primary" className="!text-xs" onClick={() => addBook(b, "want_to_read")}>
                Suggest
              </Button>
              <Button variant="secondary" className="!text-xs" onClick={() => addBook(b, "reading")}>
                Add reading
              </Button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-semibold">{selectedProfile?.display_name}&apos;s shelf</h2>
      <div className="mt-3 space-y-2">
        {shelf.map((ub) => (
          <div key={ub.id} className="rounded-lg bg-white p-3 shadow-sm">
            <p className="font-medium">{ub.book.title}</p>
            <p className="text-sm text-slate-500">
              {ub.status.replace(/_/g, " ")} · {ub.progress_percent}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
