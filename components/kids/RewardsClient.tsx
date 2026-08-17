"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Milestone {
  milestone: number;
  xp: number;
  reached: boolean;
  claimed: boolean;
}
interface Status {
  streak: number;
  milestones: Milestone[];
  todaySpinXp: number | null;
  referralCode: string | null;
  successfulReferrals: number;
}

const SPIN_SEGMENTS = [10, 15, 20, 25];

export function RewardsClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/kids/rewards/status");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setStatus(data);
    setLoading(false);
  }

  async function spin() {
    if (spinning || status?.todaySpinXp !== null) return;
    setError("");
    setSpinning(true);
    setSpinResult(null);

    const res = await fetch("/api/kids/rewards/spin", { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSpinning(false);
      setError(data.error ?? "Couldn't spin right now.");
      return;
    }

    // Spin to a random-looking stop, but land on the segment matching
    // the *already-decided* server result — the animation is cosmetic,
    // never the source of truth for the reward.
    const segmentIndex = Math.max(0, SPIN_SEGMENTS.indexOf(data.xpAwarded));
    const targetRotation = 360 * 4 + segmentIndex * (360 / SPIN_SEGMENTS.length) + 720;
    setSpinRotation(targetRotation);

    setTimeout(() => {
      setSpinning(false);
      setSpinResult(data.xpAwarded);
      setStatus((prev) => (prev ? { ...prev, todaySpinXp: data.xpAwarded } : prev));
    }, 2200);
  }

  async function claimMilestone(milestone: number) {
    setError("");
    setClaimingMilestone(milestone);
    const res = await fetch("/api/kids/rewards/streak-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestone }),
    });
    const data = await res.json().catch(() => ({}));
    setClaimingMilestone(null);
    if (!res.ok) {
      setError(data.error ?? "Couldn't claim that.");
      return;
    }
    setStatus((prev) =>
      prev
        ? { ...prev, milestones: prev.milestones.map((m) => (m.milestone === milestone ? { ...m, claimed: true } : m)) }
        : prev
    );
  }

  function copyReferralLink() {
    if (!status?.referralCode) return;
    const url = `${window.location.origin}/auth/register?ref=${status.referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !status) {
    return <p className="text-slate-500">Loading…</p>;
  }

  const alreadySpunToday = status.todaySpinXp !== null;

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold text-slate-900">🎁 Daily Rewards</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Daily spin */}
      <section className="mt-6 rounded-2xl bg-white p-6 text-center shadow-md">
        <h2 className="font-kids-display text-xl font-bold text-slate-900">Daily Spin</h2>
        <p className="mt-1 text-sm text-slate-500">One free spin a day — always between 10 and 25 XP.</p>

        <div className="relative mx-auto mt-6 h-48 w-48">
          <div className="absolute left-1/2 top-0 z-10 -ml-3 h-0 w-0 border-x-8 border-t-[14px] border-x-transparent border-t-kids-purple" />
          <div
            className="h-48 w-48 rounded-full border-8 border-kids-purple shadow-lg transition-transform"
            style={{
              transform: `rotate(${spinRotation}deg)`,
              transitionDuration: spinning ? "2.2s" : "0s",
              transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.2, 1)",
              background: `conic-gradient(#7C3AED 0deg 90deg, #14B8A6 90deg 180deg, #F472B6 180deg 270deg, #FBBF24 270deg 360deg)`,
            }}
          >
            {SPIN_SEGMENTS.map((xp, i) => {
              const angle = i * 90 + 45;
              return (
                <span
                  key={xp}
                  className="absolute left-1/2 top-1/2 text-sm font-bold text-white"
                  style={{
                    transform: `rotate(${angle}deg) translate(0, -60px) rotate(-${angle}deg)`,
                  }}
                >
                  {xp}
                </span>
              );
            })}
          </div>
        </div>

        {alreadySpunToday ? (
          <p className="mt-4 font-semibold text-emerald-600">
            {spinResult !== null ? `You got ${spinResult} XP! 🎉` : `Already claimed today: +${status.todaySpinXp} XP`}
          </p>
        ) : (
          <Button variant="kids" className="mt-4" disabled={spinning} onClick={spin}>
            {spinning ? "Spinning…" : "Spin now"}
          </Button>
        )}
      </section>

      {/* Streak milestones */}
      <section className="mt-6 rounded-2xl bg-white p-6 shadow-md">
        <h2 className="font-kids-display text-xl font-bold text-slate-900">🔥 Streak Rewards</h2>
        <p className="mt-1 text-sm text-slate-500">Current streak: {status.streak} day{status.streak === 1 ? "" : "s"}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {status.milestones.map((m) => (
            <div key={m.milestone} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div>
                <p className="font-semibold text-slate-900">{m.milestone}-day streak</p>
                <p className="text-sm text-slate-500">+{m.xp} XP</p>
              </div>
              {m.claimed ? (
                <span className="text-sm font-semibold text-emerald-600">✓ Claimed</span>
              ) : m.reached ? (
                <Button
                  variant="kids"
                  className="!px-3 !py-1.5 !text-sm"
                  disabled={claimingMilestone === m.milestone}
                  onClick={() => claimMilestone(m.milestone)}
                >
                  {claimingMilestone === m.milestone ? "Claiming…" : "Claim"}
                </Button>
              ) : (
                <span className="text-sm text-slate-400">Locked</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Referrals */}
      <section className="mt-6 rounded-2xl bg-white p-6 shadow-md">
        <h2 className="font-kids-display text-xl font-bold text-slate-900">👋 Invite a Friend</h2>
        <p className="mt-1 text-sm text-slate-500">
          Share your invite link or code. When a friend signs up with it and completes their first reading session,
          you get 100 XP and they get 25 XP.
        </p>

        {status.referralCode ? (
          <div className="mt-4 rounded-xl bg-violet-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Your invite code</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-white px-4 py-2 text-lg font-bold tracking-widest text-slate-900 shadow-sm">
                {status.referralCode}
              </code>
              <Button
                variant="secondary"
                className="!text-sm"
                onClick={() => {
                  navigator.clipboard.writeText(status.referralCode!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied!" : "Copy code"}
              </Button>
            </div>
            <p className="mt-3 break-all text-xs text-slate-500">
              Invite link: {window.location.origin}/auth/register?ref={status.referralCode}
            </p>
            <Button variant="kids" className="mt-3 !text-sm" onClick={copyReferralLink}>
              {copied ? "Copied!" : "Copy invite link"}
            </Button>
            <p className="mt-3 text-xs text-slate-500">
              Book Buddy connects the signup to your account using this code. The reward is only paid after the new
              reader completes their first reading session.
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Your invite code is still being created. Refresh this page in a moment.
          </p>
        )}

        <p className="mt-3 text-sm text-slate-500">
          Friends who completed a first reading session:{" "}
          <span className="font-semibold text-slate-900">{status.successfulReferrals}</span>
        </p>
      </section>

    </div>
  );
}
