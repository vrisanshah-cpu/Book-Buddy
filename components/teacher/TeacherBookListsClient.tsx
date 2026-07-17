"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchOpenLibrary, type OpenLibraryBook } from "@/lib/open-library";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ListBookItem = {
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
};

export function TeacherBookListsClient({
  teacherId,
  classrooms,
}: {
  teacherId: string;
  classrooms: { id: string; name: string }[];
}) {
  const supabase = createClient();
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [listName, setListName] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [listBooks, setListBooks] = useState<ListBookItem[]>([]);
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OpenLibraryBook[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    supabase
      .from("book_lists")
      .select("id, name")
      .eq("teacher_id", teacherId)
      .then(({ data }) => {
        setLists(data ?? []);
        if (data?.[0]) setSelectedList(data[0].id);
      });
  }, [teacherId, supabase]);

  useEffect(() => {
    if (!selectedList) {
      setListBooks([]);
      return;
    }
    supabase
      .from("book_list_items")
      .select("book_id, book:books(title, author, cover_url)")
      .eq("list_id", selectedList)
      .then(({ data }) => {
        const rows = (data ?? []).map((row) => {
          const b = Array.isArray(row.book) ? row.book[0] : row.book;
          return {
            book_id: row.book_id,
            title: (b as { title: string })?.title ?? "Untitled",
            author: (b as { author: string })?.author ?? "",
            cover_url: (b as { cover_url: string | null })?.cover_url ?? null,
          };
        });
        setListBooks(rows);
      });
  }, [selectedList, supabase]);

  async function createList() {
    const { data } = await supabase
      .from("book_lists")
      .insert({ teacher_id: teacherId, name: listName, classroom_id: classroomId || null })
      .select()
      .single();
    if (data) {
      setLists([...lists, data]);
      setSelectedList(data.id);
      setListName("");
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const results = await searchOpenLibrary(query);
    setSearchResults(results);
    setSearching(false);
  }

  async function addBookToList(b: OpenLibraryBook) {
    if (!selectedList) return;

    const { data: book } = await supabase
      .from("books")
      .insert({
        title: b.title,
        author: b.author,
        cover_url: b.cover_url,
        added_by: teacherId,
      })
      .select("id")
      .single();

    if (book) {
      const { error } = await supabase
        .from("book_list_items")
        .upsert({ list_id: selectedList, book_id: book.id });

      if (!error) {
        setListBooks((prev) => [
          ...prev,
          { book_id: book.id, title: b.title, author: b.author, cover_url: b.cover_url ?? null },
        ]);
      } else {
        alert("Couldn't add book to list: " + error.message);
      }
      setSearchResults(searchResults.filter((r) => r.title !== b.title));
    }
  }

  async function removeBookFromList(bookId: string) {
    await supabase
      .from("book_list_items")
      .delete()
      .eq("list_id", selectedList)
      .eq("book_id", bookId);
    setListBooks((prev) => prev.filter((i) => i.book_id !== bookId));
  }

  async function assignToClass() {
    const res = await fetch("/api/teacher/book-list/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId: selectedList, classroomId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("Assign failed: " + (data.error ?? res.status));
      return;
    }
    alert("Assigned to all students in class!");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Book Lists</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Input placeholder="New list name" value={listName} onChange={(e) => setListName(e.target.value)} />
        <Button variant="primary" onClick={createList}>
          Create list
        </Button>
      </div>

      <select
        className="mt-4 rounded border px-3 py-2"
        value={selectedList}
        onChange={(e) => setSelectedList(e.target.value)}
      >
        {lists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <div className="mt-4 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or author…"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="secondary" onClick={handleSearch} disabled={searching}>
          {searching ? "…" : "Search"}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="mt-3 space-y-2 rounded-xl border p-3">
          {searchResults.map((b, i) => (
            <div
              key={`${b.title}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{b.title}</p>
                <p className="text-sm text-slate-500">{b.author}</p>
              </div>
              <Button
                variant="primary"
                className="!px-3 !py-1.5 !text-xs shrink-0"
                onClick={() => addBookToList(b)}
              >
                Add to list
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <h2 className="font-semibold text-slate-800">
          Books in {lists.find((l) => l.id === selectedList)?.name ?? "this list"}
        </h2>
        {listBooks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No books added to this list yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {listBooks.map((item) => (
              <div
                key={item.book_id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.author}</p>
                </div>
                <Button
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-xs shrink-0"
                  onClick={() => removeBookFromList(item.book_id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2 items-center">
        <select
          className="rounded border px-3 py-2"
          value={classroomId}
          onChange={(e) => setClassroomId(e.target.value)}
        >
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button variant="primary" onClick={assignToClass}>
          Assign list to class
        </Button>
      </div>
    </div>
  );
}