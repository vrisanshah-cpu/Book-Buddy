"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Row {
  student_id: string;
  display_name: string;
  avatar_url: string | null;
  minutes_read: number;
  books_finished: number;
  booktok_posts: number;
}

const METRICS = [
  { key: "minutes_read", label: "Minutes read", emoji: "⏱️", unit: "min" },
  { key: "books_finished", label: "Books finished", emoji: "📚", unit: "books" },
  { key: "booktok_posts", label: "BookTok posts", emoji: "🎬", unit: "posts" },
] as const;

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [scope, setScope] = useState<"local" | "global">("local");
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("minutes_read");
  const [localRows, setLocalRows] = useState<Row[]>([]);
  const [globalRows, setGlobalRows] = useState<Row[]>([]);
  const [noClassroom, setNoClassroom] = useState(false);
  const [loading, setLoading] = useState(true);

  const [optedIn, setOptedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: profile } = await supabase
      .from("users")
      .select("leaderboard_opt_in, leaderboard_nickname")
      .eq("id", userId)
      .single();
    setOptedIn(profile?.leaderboard_opt_in ?? false);
    setNickname(profile?.leaderboard_nickname ?? "");

    const { data: ts } = await supabase
      .from("teacher_student")
      .select("classroom_id")
      .eq("student_id", userId)
      .limit(1)
      .maybeSingle();

    if (ts?.classroom_id) {
      const { data } = await supabase.rpc("get_classroom_leaderboard_v2", {
        p_classroom_id: ts.classroom_id,
      });
      setLocalRows((data as Row[]) ?? []);
      setNoClassroom(false);
    } else {
      setNoClassroom(true);
    }

    if (profile?.leaderboard_opt_in) {
      const { data } = await supabase.rpc("get_global_leaderboard");
      setGlobalRows((data as Row[]) ?? []);
    }

    setLoading(false);
  }

  async function saveNickname(optIn: boolean) {
    setNicknameError("");
    setSavingNickname(true);
    const res = await fetch("/api/leaderboard/nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, optIn }),
    });
    const data = await res.json();
    setSavingNickname(false);
    if (res.ok) {
      setOptedIn(optIn);
      load();
    } else {
      setNicknameError(data.error ?? "Something went wrong.");
    }
  }

  const rows = scope === "local" ? localRows : globalRows;
  const sorted = [...rows].sort((a, b) => b[metric] - a[metric]).slice(0, 20);
  const activeMetric = METRICS.find((m) => m.key === metric)!;

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Leaderboard</h1>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setScope("local")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${scope === "local" ? "bg-kids-purple text-white" : "bg-violet-50 text-slate-600"}`}
        >
          My classroom
        </button>
        <button
          type="button"
          onClick={() => setScope("global")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${scope === "global" ? "bg-kids-purple text-white" : "bg-violet-50 text-slate-600"}`}
        >
          Global
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${metric === m.key ? "bg-kids-teal text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {scope === "global" && !optedIn && (
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-md">
          <p className="font-semibold">Join the global leaderboard!</p>
          <p className="mt-1 text-sm text-slate-500">
            Pick a nickname other readers will see — not your real name. A grown-up can turn this off anytime.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Pick a nickname…"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
            <Button variant="kids" onClick={() => saveNickname(true)} disabled={savingNickname}>
              {savingNickname ? "…" : "Join"}
            </Button>
          </div>
          {nicknameError && <p className="mt-2 text-sm text-red-600">{nicknameError}</p>}
        </div>
      )}

      {scope === "global" && optedIn && (
        <p className="mt-4 text-xs text-slate-500">
          You&apos;re on the global leaderboard as <strong>{nickname}</strong>.{" "}
          <button type="button" className="underline" onClick={() => saveNickname(false)}>
            Leave global leaderboard
          </button>
        </p>
      )}

      {loading && <p className="mt-6 text-slate-500">Loading…</p>}

      {!loading && scope === "local" && noClassroom && (
        <p className="mt-6 text-slate-500">Join a classroom to see your class leaderboard!</p>
      )}

      {!loading && (scope === "local" ? !noClassroom : optedIn) && (
        <ol className="mt-6 space-y-2">
          {sorted.map((r, i) => (
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
              <span className="font-bold text-kids-purple">
                {r[metric]} {activeMetric.unit}
              </span>
            </li>
          ))}
          {sorted.length === 0 && <p className="text-slate-500">No scores yet — start reading!</p>}
        </ol>
      )}
    </div>
  );
}