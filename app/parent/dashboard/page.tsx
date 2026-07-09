import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { calculateStreak, sumMinutesInRange } from "@/lib/reading-stats";
import Link from "next/link";

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

      const { data: sessions } = await supabase
        .from("reading_sessions")
        .select("date, minutes_read")
        .eq("user_id", child.id);

      const { count: booksMonth } = await supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", child.id)
        .eq("status", "finished")
        .gte("finished_at", monthStart.toISOString());

      const { data: activeChallenges } = await supabase
        .from("user_challenges")
        .select("id")
        .eq("user_id", child.id)
        .eq("completed", false);

      return {
        child,
        streak: calculateStreak(sessions ?? []),
        minutesWeek: sumMinutesInRange(sessions ?? [], weekStart, new Date()),
        booksMonth: booksMonth ?? 0,
        activeChallenges: activeChallenges?.length ?? 0,
      };
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome, {profile.display_name}
      </h1>
      <p className="mt-1 text-parent-muted">
        Track your children&apos;s reading progress.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {childStats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">
            No child profiles yet.{" "}
            <Link href="/parent/settings" className="text-parent-primary underline">
              Add one in Settings
            </Link>
          </div>
        ) : (
          childStats.map(({ child, streak, minutesWeek, booksMonth, activeChallenges }) => (
            <div key={child.id} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{child.avatar_url ?? "📖"}</span>
                <div>
                  <h2 className="font-semibold text-slate-900">{child.display_name}</h2>
                  <p className="text-sm text-slate-500">
                    Age {child.age ?? "—"} · {child.xp ?? 0} XP
                  </p>
                </div>
              </div>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
