"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type EventStatus = "upcoming" | "active" | "closed";

interface WeekendEvent {
  id: string;
  title: string;
  description: string;
  goal_type: string;
  goal_config: { target?: number; prefix?: string; topic?: string };
  starts_at: string;
  ends_at: string;
  status: EventStatus;
}

interface MyEntry {
  event_id: string;
  progress: number;
  rank: number | null;
}

interface MyBadge {
  earned_at: string;
  badge: { code: string; name: string; description: string | null; icon: string | null; rarity: string } | null;
}

interface MyTitle {
  title_id: string;
  earned_at: string;
  title: { id: string; code: string; name: string; rarity: string } | null;
}

type Tab = "current" | "past" | "badges";

function goalLabel(ev: WeekendEvent) {
  const c = ev.goal_config ?? {};
  switch (ev.goal_type) {
    case "books_count":
      return `Finish ${c.target ?? "?"} book${(c.target ?? 0) === 1 ? "" : "s"}`;
    case "genre_diversity":
      return `Finish books from ${c.target ?? "?"} different genres`;
    case "author_prefix":
      return `Finish books by an author starting with "${c.prefix ?? "?"}"`;
    case "topic":
      return `Finish ${c.target ?? "?"} book${(c.target ?? 0) === 1 ? "" : "s"} about ${c.topic ?? "a topic"}`;
    default:
      return "";
  }
}

export function EventsClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("current");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<WeekendEvent[]>([]);
  const [myEntries, setMyEntries] = useState<Record<string, MyEntry>>({});
  const [badges, setBadges] = useState<MyBadge[]>([]);
  const [titles, setTitles] = useState<MyTitle[]>([]);
  const [equippedTitleId, setEquippedTitleId] = useState<string | null>(null);
  const [equipping, setEquipping] = useState(false);
  const [equipError, setEquipError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: eventRows }, { data: entryRows }, { data: badgeRows }, { data: titleRows }, { data: profileRow }] =
      await Promise.all([
        supabase.from("weekend_events").select("*").order("starts_at", { ascending: false }),
        supabase.from("event_entries").select("event_id, progress, rank").eq("user_id", userId),
        supabase
          .from("user_badges")
          .select("earned_at, badge:badges(code, name, description, icon, rarity)")
          .eq("user_id", userId),
        supabase
          .from("user_titles")
          .select("title_id, earned_at, title:titles(id, code, name, rarity)")
          .eq("user_id", userId),
        supabase.from("users").select("equipped_title_id").eq("id", userId).single(),
      ]);

    setEvents((eventRows as WeekendEvent[]) ?? []);

    const entryMap: Record<string, MyEntry> = {};
    (entryRows ?? []).forEach((e) => {
      entryMap[e.event_id as string] = e as unknown as MyEntry;
    });
    setMyEntries(entryMap);

    setBadges(
      (badgeRows ?? []).map((b) => ({
        earned_at: b.earned_at as string,
        badge: (Array.isArray(b.badge) ? b.badge[0] : b.badge) ?? null,
      }))
    );
    setTitles(
      (titleRows ?? []).map((t) => ({
        title_id: t.title_id as string,
        earned_at: t.earned_at as string,
        title: (Array.isArray(t.title) ? t.title[0] : t.title) ?? null,
      }))
    );
    setEquippedTitleId((profileRow?.equipped_title_id as string | null) ?? null);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function equip(titleId: string | null) {
    setEquipping(true);
    setEquipError("");
    const res = await fetch("/api/kids/equip-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titleId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEquipError(data.error ?? "Couldn't equip that title.");
    } else {
      setEquippedTitleId(titleId);
    }
    setEquipping(false);
  }

  const current = events.filter((e) => e.status !== "closed");
  const past = events.filter((e) => e.status === "closed");

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Weekend Events</h1>

      <div className="mt-4 flex gap-2">
        {(["current", "past", "badges"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === t ? "bg-kids-purple text-white" : "bg-white text-slate-600"
            }`}
          >
            {t === "badges" ? "My badges" : t === "current" ? "Current" : "Past"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : tab === "badges" ? (
        <section className="mt-6 space-y-8">
          <div>
            <h2 className="font-kids-display text-xl font-bold">Badges</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {badges.map((b, i) => (
                <div key={i} className="rounded-2xl bg-white p-4 text-center shadow-md">
                  <span className="text-4xl">{b.badge?.icon ?? "🏅"}</span>
                  <p className="mt-2 font-bold text-slate-900">{b.badge?.name}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{b.badge?.rarity}</p>
                  {b.badge?.description && <p className="mt-1 text-xs text-slate-500">{b.badge.description}</p>}
                </div>
              ))}
              {badges.length === 0 && (
                <p className="col-span-3 text-slate-500">No badges yet — join a weekend event to earn one!</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="font-kids-display text-xl font-bold">Titles</h2>
            <p className="mt-1 text-sm text-slate-500">Pick one to show next to your name.</p>
            {equipError && <p className="mt-2 text-sm text-red-600">{equipError}</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={equipping || equippedTitleId === null}
                onClick={() => equip(null)}
                className={`rounded-2xl p-4 text-center shadow-md transition ${
                  equippedTitleId === null ? "bg-kids-purple text-white" : "bg-white text-slate-700"
                }`}
              >
                <p className="font-bold">No title</p>
              </button>
              {titles.map((t) => (
                <button
                  key={t.title_id}
                  type="button"
                  disabled={equipping || equippedTitleId === t.title_id}
                  onClick={() => equip(t.title_id)}
                  className={`rounded-2xl p-4 text-center shadow-md transition ${
                    equippedTitleId === t.title_id ? "bg-kids-purple text-white" : "bg-white text-slate-700"
                  }`}
                >
                  <p className="font-bold">{t.title?.name}</p>
                  <p className="text-xs uppercase tracking-wide opacity-70">{t.title?.rarity}</p>
                </button>
              ))}
              {titles.length === 0 && <p className="col-span-3 text-slate-500">No titles earned yet.</p>}
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(tab === "current" ? current : past).map((ev) => {
            const mine = myEntries[ev.id];
            const target = Number(ev.goal_config?.target ?? 1);
            const pct = mine ? Math.min(100, Math.round((mine.progress / target) * 100)) : 0;
            return (
              <Link
                key={ev.id}
                href={`/kids/events/${ev.id}`}
                className="block rounded-2xl bg-white p-5 shadow-md transition hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      ev.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : ev.status === "upcoming"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ev.status}
                  </span>
                  {mine?.rank && <span className="text-xs font-semibold text-kids-purple">Rank #{mine.rank}</span>}
                </div>
                <h3 className="mt-2 font-bold text-slate-900">{ev.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{ev.description}</p>
                <p className="mt-2 text-xs font-semibold text-kids-teal">{goalLabel(ev)}</p>
                {mine && (
                  <>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
                      <div className="h-full bg-kids-purple transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {mine.progress} / {target}
                    </p>
                  </>
                )}
              </Link>
            );
          })}
          {(tab === "current" ? current : past).length === 0 && (
            <p className="col-span-2 text-center text-slate-500">
              {tab === "current" ? "No weekend event right now — check back Friday!" : "No past events yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}