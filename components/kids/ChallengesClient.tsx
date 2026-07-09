"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = "active" | "completed" | "available";

interface UserChallenge {
  id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  challenge: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    target_value: number;
    badge_icon: string | null;
    end_date: string | null;
  };
}

export function ChallengesClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("active");
  const [items, setItems] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await fetch("/api/challenges/enroll", { method: "POST" }).catch(() => {});

    const { data } = await supabase
      .from("user_challenges")
      .select(
        "id, progress, completed, completed_at, challenge:challenges(id, title, description, type, target_value, badge_icon, end_date)"
      )
      .eq("user_id", userId);

    setItems((data as unknown as UserChallenge[]) ?? []);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((uc) => {
    if (tab === "active") return !uc.completed;
    if (tab === "completed") return uc.completed;
    return false;
  });

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Challenges</h1>
      <div className="mt-4 flex gap-2">
        {(["active", "completed"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize ${
              tab === t ? "bg-kids-purple text-white" : "bg-white text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.map((uc) => {
            const ch = uc.challenge;
            const pct = Math.min(
              100,
              Math.round((uc.progress / ch.target_value) * 100)
            );
            return (
              <div
                key={uc.id}
                className={`rounded-2xl bg-white p-5 shadow-md ${
                  uc.completed ? "ring-2 ring-kids-yellow" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-4xl ${uc.completed ? "animate-pulse" : ""}`}>
                    {ch.badge_icon ?? "🏆"}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{ch.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{ch.description}</p>
                    {ch.end_date && (
                      <p className="mt-1 text-xs text-slate-400">
                        Due {new Date(ch.end_date).toLocaleDateString()}
                      </p>
                    )}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
                      <div
                        className="h-full bg-kids-purple transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {uc.progress} / {ch.target_value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-2 text-center text-slate-500">
              {tab === "completed"
                ? "Complete challenges to earn badges!"
                : "No active challenges. Keep reading!"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
