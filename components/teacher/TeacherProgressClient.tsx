"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

interface StudentRow {
  student_id: string;
  display_name: string;
  minutes: number;
  booksFinished: number;
  challengesDone: number;
  bestQuiz: number;
}

export function TeacherProgressClient({ teacherId }: { teacherId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<StudentRow[]>([]);

  useEffect(() => {
    async function load() {
      const { data: students } = await supabase
        .from("teacher_student")
        .select("student_id, student:users!student_id(display_name)")
        .eq("teacher_id", teacherId);

      const result: StudentRow[] = [];
      for (const s of students ?? []) {
        const studentData = Array.isArray(s.student) ? s.student[0] : s.student;
        const name = (studentData as { display_name: string })?.display_name ?? "Student";
        const sid = s.student_id;

        const { data: sessions } = await supabase
          .from("reading_sessions")
          .select("minutes_read")
          .eq("user_id", sid);
        const minutes = (sessions ?? []).reduce((a, x) => a + x.minutes_read, 0);

        const { count: booksFinished } = await supabase
          .from("user_books")
          .select("*", { count: "exact", head: true })
          .eq("user_id", sid)
          .eq("status", "finished");

        const { count: challengesDone } = await supabase
          .from("user_challenges")
          .select("*", { count: "exact", head: true })
          .eq("user_id", sid)
          .eq("completed", true);

        const { data: scores } = await supabase
          .from("reading_game_scores")
          .select("score")
          .eq("user_id", sid);
        const bestQuiz = Math.max(0, ...(scores?.map((x) => x.score) ?? [0]));

        result.push({
          student_id: sid,
          display_name: name,
          minutes,
          booksFinished: booksFinished ?? 0,
          challengesDone: challengesDone ?? 0,
          bestQuiz,
        });
      }
      setRows(result);
    }
    load();
  }, [teacherId, supabase]);

  function exportCsv() {
    const header = "Name,Minutes,Books Finished,Challenges,Best Quiz %\n";
    const body = rows
      .map(
        (r) =>
          `${r.display_name},${r.minutes},${r.booksFinished},${r.challengesDone},${r.bestQuiz}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-progress.csv";
    a.click();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Student Progress</h1>
        <Button variant="primary" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Minutes</th>
              <th className="px-4 py-3">Books</th>
              <th className="px-4 py-3">Challenges</th>
              <th className="px-4 py-3">Best quiz</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student_id} className="border-t">
                <td className="px-4 py-3">{r.display_name}</td>
                <td className="px-4 py-3">{r.minutes}</td>
                <td className="px-4 py-3">{r.booksFinished}</td>
                <td className="px-4 py-3">{r.challengesDone}</td>
                <td className="px-4 py-3">{r.bestQuiz}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
