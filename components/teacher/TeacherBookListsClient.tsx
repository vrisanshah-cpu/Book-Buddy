"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchOpenLibrary } from "@/lib/open-library";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? "");
  const [query, setQuery] = useState("");

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

  async function addBookToList() {
    const results = await searchOpenLibrary(query);
    const b = results[0];
    if (!b || !selectedList) return;

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
      await supabase.from("book_list_items").upsert({
        list_id: selectedList,
        book_id: book.id,
      });
    }
  }

  async function assignToClass() {
    await fetch("/api/teacher/book-list/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId: selectedList, classroomId }),
    });
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
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Add book…" />
        <Button variant="secondary" onClick={addBookToList}>
          Add
        </Button>
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
