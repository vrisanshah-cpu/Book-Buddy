"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TeacherClubModeration } from "@/components/teacher/TeacherClubModeration";

export function TeacherBookClubsClient({ teacherId }: { teacherId: string }) {
  const supabase = createClient();
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [moderateClub, setModerateClub] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    supabase
      .from("book_clubs")
      .select("id, name")
      .eq("created_by", teacherId)
      .then(({ data }) => setClubs(data ?? []));
  }, [teacherId, supabase]);

  async function create() {
    const res = await fetch("/api/book-clubs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) {
      const { club } = await res.json();
      setClubs([...clubs, club]);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Book Clubs</h1>
      <div className="mt-6 space-y-2">
        {clubs.map((c) => (
          <div key={c.id} className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex justify-between">
              <span className="font-semibold">{c.name}</span>
              <Button
                variant="secondary"
                className="!text-xs"
                onClick={() => setModerateClub(moderateClub === c.id ? null : c.id)}
              >
                Moderate
              </Button>
            </div>
            {moderateClub === c.id && <TeacherClubModeration clubId={c.id} />}
          </div>
        ))}
      </div>
      <div className="mt-8 space-y-3 rounded-xl bg-white p-6 shadow-sm">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button variant="primary" onClick={create}>
          Create class book club
        </Button>
      </div>
    </div>
  );
}
