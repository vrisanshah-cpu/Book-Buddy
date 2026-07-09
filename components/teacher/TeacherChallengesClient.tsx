"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function TeacherChallengesClient({
  teacherId,
  classrooms,
}: {
  teacherId: string;
  classrooms: { id: string; name: string }[];
}) {
  const supabase = createClient();
  const [challenges, setChallenges] = useState<{ id: string; title: string; type: string }[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("minutes_read");
  const [target, setTarget] = useState("100");
  const [badge, setBadge] = useState("🏆");
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? "");

  useEffect(() => {
    supabase
      .from("challenges")
      .select("id, title, type")
      .eq("created_by", teacherId)
      .then(({ data }) => setChallenges(data ?? []));
  }, [teacherId, supabase]);

  async function createChallenge() {
    const res = await fetch("/api/teacher/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        type,
        targetValue: parseInt(target, 10),
        badgeIcon: badge,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        classroomId,
      }),
    });
    if (res.ok) {
      const { challenge } = await res.json();
      setChallenges([...challenges, challenge]);
      setTitle("");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Challenges</h1>

      <ul className="mt-6 space-y-2">
        {challenges.map((c) => (
          <li key={c.id} className="rounded-lg bg-white p-4 shadow-sm">
            {c.title} <span className="text-slate-500">({c.type})</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-xl bg-white p-6 shadow-sm space-y-3">
        <h2 className="font-semibold">Create challenge</h2>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="w-full rounded border px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="reading_streak">Reading streak</option>
          <option value="books_finished">Books finished</option>
          <option value="minutes_read">Minutes read</option>
          <option value="quiz_score">Quiz score</option>
        </select>
        <Input label="Target" value={target} onChange={(e) => setTarget(e.target.value)} />
        <Input label="Badge emoji" value={badge} onChange={(e) => setBadge(e.target.value)} />
        <select className="w-full rounded border px-3 py-2" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button variant="primary" onClick={createChallenge}>
          Create & assign to class
        </Button>
      </div>
    </div>
  );
}
