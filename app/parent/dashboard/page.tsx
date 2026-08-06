import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { calculateStreak, sumMinutesInRange } from "@/lib/reading-stats";
import { getLevel } from "@/lib/xp";
import Link from "next/link";
import Image from "next/image";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

export default async function ParentDashboardPage() {
  const { profile } = await getProfile();
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: links } = await supabase
    .from("parent_child")
    .select("child:users!child_id(id, display_name, xp, avatar_url, age)")
    .eq("parent_id", profile.id);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date();
  monthStart.setDate(1);

  const childStats = await Promise.all(
    (links ?? []).map(async (row) => {
      const childData = Array.isArray(row.child) ? row.child[0] : row.child;
      const child = childData as {
        id: string;
        display_name: string;
        xp: number;
        avatar_url: string | null;
        age: number | null;
      };

      const historyStart = new Date();
      historyStart.setDate(historyStart.getDate() - 370);

      const [{ data: sessions }, { data: currentBook }, { count: booksMonth }, { data: activeChallenges }] =
        await Promise.all([
          supabase
            .from("reading_sessions")
            .select("date, minutes_read")
            .eq("user_id", child.id)
            .gte("date", historyStart.toISOString().split("T")[0]),
          supabase
            .from("user_books")
            .select("progress_percent, book:books(title, cover_url)")
            .eq("user_id", child.id)
            .eq("status", "reading")
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("user_books")
            .select("*", { count: "exact", head: true })
            .eq("user_id", child.id)
            .eq("status", "finished")
            .gte("finished_at", monthStart.toISOString()),
          supabase
            .from("user_challenges")
            .select("id")
            .eq("user_id", child.id)
            .eq("completed", false),
        ]);

      const bookData = Array.isArray(currentBook?.book) ? currentBook.book[0] : currentBook?.book;

      return {
        child,
        streak: calculateStreak(sessions ?? []),
        minutesWeek: sumMinutesInRange(sessions ?? [], weekStart, new Date()),
        booksMonth: booksMonth ?? 0,
        activeChallenges: activeChallenges?.length ?? 0,
        currentBook: (bookData ?? null) as { title: string; cover_url: string | null } | null,
        currentBookProgress: currentBook?.progress_percent ?? 0,
        level: getLevel(child.xp ?? 0),
      };
    })
  );

  const familyMinutesWeek = childStats.reduce((a, s) => a + s.minutesWeek, 0);
  const familyBooksMonth = childStats.reduce((a, s) => a + s.booksMonth, 0);
  const longestStreak = childStats.reduce((a, s) => Math.max(a, s.streak), 0);

  return (
    <div>
      <GoogleAdsense />
      <h1 className="text-2xl font-bold text-slate-900">Welcome, {profile.display_name}</h1>
      <p className="mt-1 text-parent-muted">Track your children&apos;s reading progress.</p>

      {childStats.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-white p-5 shadow-sm sm:gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-parent-primary">{familyMinutesWeek}</p>
            <p className="text-sm text-parent-muted">Family minutes this week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-parent-primary">{familyBooksMonth}</p>
            <p className="text-sm text-parent-muted">Books finished this month</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-parent-primary">🔥 {longestStreak}</p>
            <p className="text-sm text-parent-muted">Longest active streak</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {childStats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">
            No child profiles yet.{" "}
            <Link href="/parent/settings" className="text-parent-primary underline">
              Add one in Settings
            </Link>
          </div>
        ) : (
          childStats.map(
            ({ child, streak, minutesWeek, booksMonth, activeChallenges, currentBook, currentBookProgress, level }) => (
              <Link
                key={child.id}
                href={`/parent/child/${child.id}`}
                className="block rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl">
                    {child.avatar_url ?? "📖"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-900">{child.display_name}</h2>
                    <p className="text-sm text-slate-500">
                      Age {child.age ?? "—"} · Level {level.level} · {child.xp ?? 0} XP
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-parent-primary">View →</span>
                </div>

                {currentBook && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    {currentBook.cover_url ? (
                      <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded">
                        <Image src={currentBook.cover_url} alt="" fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <span className="text-xl">📕</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{currentBook.title}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-parent-primary"
                          style={{ width: `${currentBookProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-bold text-slate-900">🔥 {streak}</p>
                    <p className="text-slate-500">Streak</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-bold text-slate-900">{booksMonth}</p>
                    <p className="text-slate-500">Books/mo</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-bold text-slate-900">{minutesWeek}</p>
                    <p className="text-slate-500">Min/week</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-bold text-slate-900">{activeChallenges}</p>
                    <p className="text-slate-500">Challenges</p>
                  </div>
                </div>
              </Link>
            )
          )
        )}
      </div>
    </div>
  );
}
