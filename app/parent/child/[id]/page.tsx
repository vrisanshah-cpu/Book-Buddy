import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getProfile, createClient } from "@/lib/supabase/server";
import { calculateStreak, sumMinutesInRange } from "@/lib/reading-stats";
import { getLevel, xpProgressInLevel } from "@/lib/xp";
import { ChildDetailTabs } from "@/components/parent/ChildDetailTabs";

export default async function ParentChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: childId } = await params;
  const { profile } = await getProfile();
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  // RLS (public.is_parent_of) is what actually enforces this parent can
  // only ever see their own linked children -- this check is just for a
  // fast, friendly 404 instead of a page full of empty sections when
  // someone edits the URL to a child that isn't theirs.
  const { data: link } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", profile.id)
    .eq("child_id", childId)
    .maybeSingle();
  if (!link) notFound();

  const { data: child } = await supabase
    .from("users")
    .select("id, display_name, xp, avatar_url, age")
    .eq("id", childId)
    .single();
  if (!child) notFound();

  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 370);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date();
  monthStart.setDate(1);

  const [
    { data: sessions },
    { data: currentlyReading },
    { data: finishedBooks },
    { data: wantToRead },
    { data: eventEntries },
    { data: badgeRows },
    { data: submissions },
  ] = await Promise.all([
    supabase
      .from("reading_sessions")
      .select("date, minutes_read")
      .eq("user_id", childId)
      .gte("date", yearAgo.toISOString().split("T")[0]),
    supabase
      .from("user_books")
      .select("progress_percent, started_at, book:books(id, title, author, cover_url, genre)")
      .eq("user_id", childId)
      .eq("status", "reading")
      .order("started_at", { ascending: false }),
    supabase
      .from("user_books")
      .select("finished_at, book:books(id, title, author, cover_url, genre)")
      .eq("user_id", childId)
      .eq("status", "finished")
      .order("finished_at", { ascending: false })
      .limit(30),
    supabase
      .from("user_books")
      .select("book:books(id, title, author, cover_url, genre)")
      .eq("user_id", childId)
      .eq("status", "want_to_read")
      .limit(20),
    supabase
      .from("event_entries")
      .select("progress, rank, event:weekend_events(id, title, status, starts_at, ends_at)")
      .eq("user_id", childId)
      .limit(12),
    supabase
      .from("user_badges")
      .select("earned_at, badge:badges(id, name, icon, description)")
      .eq("user_id", childId)
      .order("earned_at", { ascending: false }),
    supabase
      .from("writing_submissions")
      .select("id, title, community_votes, is_winner, created_at, competition:writing_competitions(title)")
      .eq("author_id", childId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const rows = sessions ?? [];
  const streak = calculateStreak(rows);
  const minutesWeek = sumMinutesInRange(rows, weekStart, new Date());
  const minutesMonth = sumMinutesInRange(rows, monthStart, new Date());
  const { level, title: levelTitle } = getLevel(child.xp ?? 0);
  const progress = xpProgressInLevel(child.xp ?? 0);

  // Last 7 days, oldest to newest, for the little activity bars.
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    const minutes = rows.filter((s) => s.date.split("T")[0] === key).reduce((a, s) => a + (s.minutes_read ?? 0), 0);
    return { label: d.toLocaleDateString(undefined, { weekday: "short" }), minutes };
  });

  const unwrap = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const sortedEventEntries = (eventEntries ?? [])
    .map((r) => ({ progress: r.progress, rank: r.rank, event: unwrap(r.event) }))
    .sort((a, b) => {
      if (!a.event || !b.event) return 0;
      return new Date(b.event.starts_at).getTime() - new Date(a.event.starts_at).getTime();
    });

  return (
    <div>
      <Link href="/parent/dashboard" className="text-sm font-semibold text-parent-primary hover:underline">
        ← All children
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl bg-white p-6 shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-4xl">
          {child.avatar_url ?? "📖"}
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{child.display_name}</h1>
          <p className="text-sm text-parent-muted">
            Age {child.age ?? "—"} · Level {level} ({levelTitle}) · {child.xp ?? 0} XP
          </p>
          <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-parent-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-xl bg-slate-50 px-4 py-2">
            <p className="font-bold text-slate-900">🔥 {streak}</p>
            <p className="text-parent-muted">Day streak</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-2">
            <p className="font-bold text-slate-900">{minutesWeek}</p>
            <p className="text-parent-muted">Min this week</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-2">
            <p className="font-bold text-slate-900">{minutesMonth}</p>
            <p className="text-parent-muted">Min this month</p>
          </div>
        </div>
      </div>

      <ChildDetailTabs
        last7Days={last7Days}
        currentlyReading={(currentlyReading ?? []).map((r) => ({
          progressPercent: r.progress_percent,
          book: unwrap(r.book),
        }))}
        finishedBooks={(finishedBooks ?? []).map((r) => ({
          finishedAt: r.finished_at,
          book: unwrap(r.book),
        }))}
        wantToRead={(wantToRead ?? []).map((r) => ({ book: unwrap(r.book) }))}
        eventEntries={sortedEventEntries}
        badges={(badgeRows ?? []).map((r) => ({ earnedAt: r.earned_at, badge: unwrap(r.badge) }))}
        submissions={(submissions ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          votes: r.community_votes,
          isWinner: r.is_winner,
          createdAt: r.created_at,
          competitionTitle: unwrap(r.competition)?.title ?? null,
        }))}
      />
    </div>
  );
}
