"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchOpenLibrary } from "@/lib/open-library";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ParentBookClubsClient({ parentId }: { parentId: string }) {
  const supabase = createClient();
  const [clubs, setClubs] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<{ title: string; author: string; cover_url: string | null } | null>(null);

  useEffect(() => {
    supabase
      .from("book_clubs")
      .select("id, name, description")
      .eq("created_by", parentId)
      .then(({ data }) => setClubs(data ?? []));
  }, [parentId, supabase]);

  async function createClub() {
    const res = await fetch("/api/book-clubs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        book: selectedBook,
      }),
    });
    if (res.ok) {
      const { club } = await res.json();
      setClubs([...clubs, club]);
      setName("");
      setDescription("");
      setSelectedBook(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Book Clubs</h1>

      <div className="mt-6 space-y-2">
        {clubs.map((c) => (
          <div key={c.id} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="font-semibold">{c.name}</p>
            <p className="text-sm text-slate-500">{c.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Create a book club</h2>
        <div className="mt-4 space-y-3">
          <Input label="Club name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Search book…" value={bookQuery} onChange={(e) => setBookQuery(e.target.value)} />
            <Button
              variant="secondary"
              onClick={async () => {
                const r = await searchOpenLibrary(bookQuery);
                if (r[0]) setSelectedBook(r[0]);
              }}
            >
              Pick
            </Button>
          </div>
          {selectedBook && (
            <p className="text-sm">Current book: {selectedBook.title}</p>
          )}
          <Button variant="primary" onClick={createClub}>
            Create club
          </Button>
        </div>
      </div>
    </div>
  );
}
