import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("weekend_events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!event) notFound();

  const { data: leaderboard } = await supabase.rpc("get_event_leaderboard", {
    p_event_id: params.id,
  });

  const rows = (leaderboard ?? []) as {
    student_id: string;
    display_name: string;
    avatar_url: string | null;
    progress: number;
    rank: number | null;
    is_me: boolean;
  }[];

  const winners = rows.filter((r) => r.rank !== null && r.rank <= 3);
  const target = Number((event.goal_config as { target?: number })?.target ?? 1);

  return (
    <div>
      <Link href="/kids/events" className="text-sm font-semibold text-kids-purple">
        ← Back to events
      </Link>

      <h1 className="mt-2 font-kids-display text-3xl font-bold">{event.title}</h1>
      <p className="mt-1 text-slate-600">{event.description}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {new Date(event.starts_at).toLocaleDateString()} – {new Date(event.ends_at).toLocaleDateString()} · {event.status}
      </p>

      {winners.length > 0 && (
        <section className="mt-6">
          <h2 className="font-kids-display text-xl font-bold">Winners 🎉</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {winners.map((w) => (
              <div
                key={w.student_id}
                className={`rounded-2xl bg-white p-4 text-center shadow-md ${w.is_me ? "ring-2 ring-kids-yellow" : ""}`}
              >
                <p className="text-3xl">{w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : "🥉"}</p>
                <p className="mt-1 font-bold text-slate-900">{w.display_name}</p>
                <p className="text-xs text-slate-500">
                  {w.progress} / {target}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-kids-display text-xl font-bold">Leaderboard</h2>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-violet-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Reader</th>
                <th className="px-4 py-3">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    No entries yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.student_id}
                    className={`border-t border-violet-50 ${r.is_me ? "bg-violet-50/60 font-semibold" : ""}`}
                  >
                    <td className="px-4 py-3">{r.rank ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.display_name}
                      {r.is_me ? " (you)" : ""}
                    </td>
                    <td className="px-4 py-3">
                      {r.progress} / {target}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}