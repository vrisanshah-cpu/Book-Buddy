"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface StudentSummary {
  id: string;
  name: string;
  booksFinished: number;
  lastSessionDate: string | null;
}

interface TopBook {
  bookId: string;
  title: string;
  author: string;
  finishCount: number;
}

function bucketLabel(n: number): string {
  return n >= 5 ? "5+" : String(n);
}

const BUCKET_ORDER = ["0", "1", "2", "3", "4", "5+"];

/**
 * Read-only classroom overview for teachers: a books-finished distribution
 * chart, a "needs attention" list (no reading sessions in the last N
 * days), and the classroom's most-finished books. All data is aggregated
 * server-side in app/teacher/analytics/page.tsx from tables teachers
 * already have RLS read access to (user_books, reading_sessions —
 * "..._teacher_read" policies, migration 001) — no new migration needed.
 */
export function ClassroomAnalytics({
  students,
  topBooks,
  needsAttentionDays,
}: {
  students: StudentSummary[];
  topBooks: TopBook[];
  needsAttentionDays: number;
}) {
  const bucketCounts = new Map<string, number>();
  for (const s of students) {
    const label = bucketLabel(s.booksFinished);
    bucketCounts.set(label, (bucketCounts.get(label) ?? 0) + 1);
  }
  const distribution = BUCKET_ORDER.filter((label) => bucketCounts.has(label)).map((label) => ({
    label,
    students: bucketCounts.get(label) ?? 0,
  }));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - needsAttentionDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const needsAttention = [...students]
    .filter((s) => !s.lastSessionDate || s.lastSessionDate < cutoffStr)
    .sort((a, b) => (a.lastSessionDate ?? "").localeCompare(b.lastSessionDate ?? ""));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Classroom Analytics</h1>
      <p className="mt-1 text-teacher-muted">A read-only overview of how your class is doing.</p>

      {students.length === 0 ? (
        <p className="mt-6 text-sm text-teacher-muted">No students linked yet.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Books finished per student</h2>
            <div
              className="mt-4 h-64"
              role="img"
              aria-label="Bar chart of how many students have finished each number of books"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" label={{ value: "Books finished", position: "insideBottom", offset: -4 }} />
                  <YAxis allowDecimals={false} label={{ value: "Students", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="students" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Top classroom books</h2>
            {topBooks.length === 0 ? (
              <p className="mt-4 text-sm text-teacher-muted">No finished books yet.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {topBooks.map((b, i) => (
                  <li key={b.bookId} className="flex items-center justify-between gap-3 rounded-lg bg-teacher-bg px-4 py-2 text-sm">
                    <span>
                      <span className="mr-2 font-semibold text-teacher-primary">#{i + 1}</span>
                      {b.title} <span className="text-teacher-muted">by {b.author}</span>
                    </span>
                    <span className="font-semibold text-slate-900">{b.finishCount} finished</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="font-semibold text-slate-900">Needs attention</h2>
            <p className="mt-1 text-sm text-teacher-muted">
              No reading sessions logged in the last {needsAttentionDays} days.
            </p>
            {needsAttention.length === 0 ? (
              <p className="mt-4 text-sm text-teacher-muted">Everyone&apos;s reading regularly — nice!</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {needsAttention.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-2 text-sm">
                    <span className="font-semibold text-slate-900">{s.name}</span>
                    <span className="text-teacher-muted">
                      {s.lastSessionDate ? `Last read ${s.lastSessionDate}` : "No sessions logged yet"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
