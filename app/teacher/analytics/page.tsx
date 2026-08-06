import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { ClassroomAnalytics } from "@/components/teacher/ClassroomAnalytics";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

const NEEDS_ATTENTION_DAYS = 14;

export default async function TeacherAnalyticsPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");

  const supabase = await createClient();

  const { data: links } = await supabase
    .from("teacher_student")
    .select("student_id, student:users!student_id(display_name)")
    .eq("teacher_id", user.id);

  const students = (links ?? []).map((l) => {
    const s = Array.isArray(l.student) ? l.student[0] : l.student;
    return {
      id: l.student_id as string,
      name: (s as { display_name: string } | null)?.display_name ?? "Student",
    };
  });
  const studentIds = students.map((s) => s.id);

  const booksFinished: Record<string, number> = {};
  const lastSessionByStudent: Record<string, string> = {};
  const topBooksMap: Record<string, { title: string; author: string; count: number }> = {};

  if (studentIds.length > 0) {
    const { data: finishedRows } = await supabase
      .from("user_books")
      .select("user_id, book_id, book:books(title, author)")
      .in("user_id", studentIds)
      .eq("status", "finished");

    for (const row of finishedRows ?? []) {
      booksFinished[row.user_id] = (booksFinished[row.user_id] ?? 0) + 1;
      const book = Array.isArray(row.book) ? row.book[0] : row.book;
      if (book && row.book_id) {
        const key = row.book_id as string;
        if (!topBooksMap[key]) topBooksMap[key] = { title: book.title, author: book.author, count: 0 };
        topBooksMap[key].count += 1;
      }
    }

    const { data: sessionRows } = await supabase
      .from("reading_sessions")
      .select("user_id, date")
      .in("user_id", studentIds);

    for (const row of sessionRows ?? []) {
      const current = lastSessionByStudent[row.user_id];
      if (!current || row.date > current) lastSessionByStudent[row.user_id] = row.date;
    }
  }

  const studentSummaries = students.map((s) => ({
    id: s.id,
    name: s.name,
    booksFinished: booksFinished[s.id] ?? 0,
    lastSessionDate: lastSessionByStudent[s.id] ?? null,
  }));

  const topBooks = Object.entries(topBooksMap)
    .map(([bookId, v]) => ({ bookId, title: v.title, author: v.author, finishCount: v.count }))
    .sort((a, b) => b.finishCount - a.finishCount)
    .slice(0, 8);

  return (
    <>
      <GoogleAdsense />
      <ClassroomAnalytics students={studentSummaries} topBooks={topBooks} needsAttentionDays={NEEDS_ATTENTION_DAYS} />
    </>
  );
}
