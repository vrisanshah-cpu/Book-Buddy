"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type GoalType = "books_count" | "minutes_read";

interface KidRef {
  id: string;
  display_name: string;
}
interface Invite {
  id: string;
  from_kid_id: string;
  to_kid_id: string;
  title: string;
  description: string;
  goal_type: GoalType;
  target: number;
  ends_at: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  from_kid: KidRef | null;
  to_kid: KidRef | null;
}
interface BuddyChallenge {
  id: string;
  title: string;
  description: string;
  goal_type: GoalType;
  target: number;
  status: "active" | "completed" | "expired";
  ends_at: string;
}
interface Pair {
  id: string;
  challenge_id: string;
  kid_a_id: string;
  kid_b_id: string;
  combined_progress: number;
  completed_at: string | null;
  challenge: BuddyChallenge | null;
  kid_a: KidRef | null;
  kid_b: KidRef | null;
}

const GOAL_LABEL: Record<GoalType, string> = {
  books_count: "books finished (combined)",
  minutes_read: "minutes read (combined)",
};

export function BuddyClient({ currentUserId, classmates }: { currentUserId: string; classmates: KidRef[] }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [toKidId, setToKidId] = useState(classmates[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("books_count");
  const [target, setTarget] = useState("6");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/kids/buddy-invite");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setInvites(data.invites ?? []);
      setPairs(data.pairs ?? []);
    }
    setLoading(false);
  }

  async function sendInvite() {
    setError("");
    if (!toKidId || !title.trim() || !description.trim() || !endsAt) {
      setError("Fill in every field.");
      return;
    }
    const res = await fetch("/api/kids/buddy-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toKidId,
        title: title.trim(),
        description: description.trim(),
        goalType,
        target: Number(target),
        endsAt: new Date(endsAt).toISOString(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't send that invite.");
      return;
    }
    setTitle("");
    setDescription("");
    setEndsAt("");
    await load();
  }

  async function respond(inviteId: string, action: "accept" | "decline" | "cancel") {
    setError("");
    setBusyId(inviteId);
    const res = await fetch(`/api/kids/buddy-invite/${inviteId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Couldn't do that.");
      return;
    }
    await load();
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <div>
      <h1 className="font-kids-display text-2xl font-bold text-slate-900">Buddy Reading</h1>
      <p className="mt-1 text-slate-500">Team up with a classmate on a shared reading goal.</p>

      {classmates.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">
          You&apos;ll need a classmate linked to start a buddy challenge.
        </p>
      ) : (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-md">
          <h2 className="font-semibold text-slate-900">Invite a buddy</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select
              value={toKidId}
              onChange={(e) => setToKidId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2"
            >
              {classmates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
            </select>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as GoalType)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2"
            >
              <option value="books_count">Finish books together</option>
              <option value="minutes_read">Read minutes together</option>
            </select>
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input
              type="number"
              min={1}
              placeholder={`Target ${GOAL_LABEL[goalType]}`}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Input
              className="sm:col-span-2"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <label className="text-sm text-slate-600 sm:col-span-2">
              Ends
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2"
              />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <Button variant="kids" className="mt-3" onClick={sendInvite}>
            Send invite
          </Button>
        </div>
      )}

      {!loading && pendingInvites.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="font-semibold text-slate-900">Invites</h2>
          {pendingInvites.map((inv) => {
            const isIncoming = inv.to_kid_id === currentUserId;
            const busy = busyId === inv.id;
            return (
              <div key={inv.id} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">{inv.title}</span> —{" "}
                  {isIncoming ? `from ${inv.from_kid?.display_name}` : `to ${inv.to_kid?.display_name}`}: reach{" "}
                  {inv.target} {GOAL_LABEL[inv.goal_type]}
                </p>
                <p className="text-xs text-slate-500">{inv.description}</p>
                <div className="mt-2 flex gap-2">
                  {isIncoming ? (
                    <>
                      <button disabled={busy} onClick={() => respond(inv.id, "accept")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
                        Accept
                      </button>
                      <button disabled={busy} onClick={() => respond(inv.id, "decline")} className="text-xs font-semibold text-red-500 hover:text-red-700">
                        Decline
                      </button>
                    </>
                  ) : (
                    <button disabled={busy} onClick={() => respond(inv.id, "cancel")} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <h2 className="font-semibold text-slate-900">Your challenges</h2>
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && pairs.length === 0 && <p className="text-sm text-slate-400">No buddy challenges yet.</p>}
        {pairs.map((p) => {
          const buddy = p.kid_a_id === currentUserId ? p.kid_b : p.kid_a;
          const target = p.challenge?.target ?? 1;
          const pct = Math.min(100, Math.round((p.combined_progress / target) * 100));
          return (
            <div key={p.id} className="rounded-2xl bg-white p-4 shadow-md">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">
                  {p.challenge?.title} <span className="font-normal text-slate-500">with {buddy?.display_name}</span>
                </p>
                {p.completed_at && <span className="text-xs font-bold text-emerald-600">🎉 Complete! +150 XP each</span>}
              </div>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full bg-violet-100"
                role="progressbar"
                aria-label={`${p.challenge?.title} joint progress`}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-kids-purple" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {p.combined_progress} / {target} {p.challenge && GOAL_LABEL[p.challenge.goal_type]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
