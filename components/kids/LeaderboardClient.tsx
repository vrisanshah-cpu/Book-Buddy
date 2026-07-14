"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Row {
  student_id: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [noClassroom, setNoClassroom] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: ts } = await supabase
      .from("teacher_student")
      .select("classroom_id")
      .eq("student_id", userId)
      .limit(1)
      .maybeSingle();

    if (!ts?.classroom_id) {
      setNoClassroom(true);
      setLoading(false);
      return;
    }

    const { data } = await supabase.rpc("get_classroom_leaderboard", {
      p_classroom_id: ts.classroom_id,
    });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Leaderboard</h1>
      <p className="mt-1 text-slate-600">Top readers in your classroom, by XP.</p>

      {loading && <p className="mt-6 text-slate-500">Loading…</p>}

      {!loading && noClassroom && (
        <p className="mt-6 text-slate-500">Join a classroom to see your class leaderboard!</p>
      )}

      {!loading && !noClassroom && (
        <ol className="mt-6 space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.student_id}
              className={`flex items-center justify-between rounded-2xl p-4 shadow-sm ${
                r.student_id === userId ? "bg-violet-100" : "bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="w-8 text-center text-xl">{MEDALS[i] ?? i + 1}</span>
                <span className="font-semibold">{r.display_name}</span>
              </span>
              <span className="font-bold text-kids-purple">{r.xp} XP</span>
            </li>
          ))}
          {rows.length === 0 && <p className="text-slate-500">No scores yet — start reading!</p>}
        </ol>
      )}
    </div>
  );
}