"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Prize {
  xp: string;
  badgeName: string;
  badgeIcon: string;
  titleName: string;
}
interface Competition {
  id: string;
  title: string;
  prompt: string;
  prizes: { official?: Record<string, unknown>; community?: Record<string, unknown> };
  starts_at: string;
  ends_at: string;
  status: "draft" | "active" | "judging" | "completed";
}
interface Submission {
  id: string;
  title: string;
  content: string;
  community_votes: number;
  is_winner: boolean;
  author: { id: string; display_name: string } | null;
}

const EMPTY_PRIZE: Prize = { xp: "", badgeName: "", badgeIcon: "🏆", titleName: "" };

function toPrizePayload(p: Prize): Record<string, unknown> | undefined {
  if (!p.xp && !p.badgeName && !p.titleName) return undefined;
  return {
    xp: p.xp ? Number(p.xp) : undefined,
    badgeName: p.badgeName || undefined,
    badgeIcon: p.badgeIcon || undefined,
    titleName: p.titleName || undefined,
  };
}

export function AdminCompetitionsClient() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [officialPrize, setOfficialPrize] = useState<Prize>(EMPTY_PRIZE);
  const [communityPrize, setCommunityPrize] = useState<Prize>(EMPTY_PRIZE);
  const [creating, setCreating] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [judging, setJudging] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/competitions");
    const data = await res.json().catch(() => ({}));
    setCompetitions(res.ok ? data.competitions ?? [] : []);
    setLoading(false);
  }

  async function createCompetition() {
    setError("");
    if (!title.trim() || !prompt.trim() || !startsAt || !endsAt) {
      setError("Fill in every field.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        prompt: prompt.trim(),
        prizes: { official: toPrizePayload(officialPrize), community: toPrizePayload(communityPrize) },
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't create that competition.");
      return;
    }
    setTitle("");
    setPrompt("");
    setStartsAt("");
    setEndsAt("");
    setOfficialPrize(EMPTY_PRIZE);
    setCommunityPrize(EMPTY_PRIZE);
    await load();
  }

  async function openSubmissions(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const res = await fetch(`/api/competitions/${id}`);
    const data = await res.json().catch(() => ({}));
    setSubmissions(res.ok ? data.submissions ?? [] : []);
  }

  async function judge(competitionId: string, submissionId: string) {
    setJudging(true);
    setError("");
    const res = await fetch(`/api/competitions/${competitionId}/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officialWinnerSubmissionId: submissionId }),
    });
    const data = await res.json().catch(() => ({}));
    setJudging(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't judge that competition.");
      return;
    }
    setExpandedId(null);
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-admin-primary">Writing Competitions</h1>
      <p className="mt-1 text-admin-muted">Run bi-monthly writing prompts with custom prizes.</p>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-admin-primary">New competition</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Writing prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="sm:col-span-2" />
          <label className="text-sm text-slate-600">
            Starts
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
            />
          </label>
          <label className="text-sm text-slate-600">
            Ends
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PrizeEditor label="🏆 Official winner prize" prize={officialPrize} onChange={setOfficialPrize} />
          <PrizeEditor label="❤️ Community winner prize" prize={communityPrize} onChange={setCommunityPrize} />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button variant="secondary" className="mt-4" disabled={creating} onClick={createCompetition}>
          {creating ? "Creating…" : "Create competition"}
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-admin-muted">Loading…</p>}
        {!loading && competitions.length === 0 && <p className="text-sm text-admin-muted">No competitions yet.</p>}
        {competitions.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-admin-primary">{c.title}</p>
                <p className="text-sm text-admin-muted">{c.prompt}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{c.status}</span>
            </div>
            {(c.status === "judging" || c.status === "completed") && (
              <button
                type="button"
                onClick={() => openSubmissions(c.id)}
                className="mt-2 text-xs font-semibold text-admin-primary underline"
              >
                {expandedId === c.id ? "Hide submissions" : "View submissions"}
              </button>
            )}
            {expandedId === c.id && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {submissions.length === 0 && <p className="text-sm text-admin-muted">No submissions.</p>}
                {submissions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold">{s.title}</span> by {s.author?.display_name} — {s.community_votes} votes
                      {s.is_winner && <span className="ml-2 text-emerald-600">🏆 Winner</span>}
                    </span>
                    {c.status === "judging" && (
                      <button
                        type="button"
                        disabled={judging}
                        onClick={() => judge(c.id, s.id)}
                        className="shrink-0 text-xs font-semibold text-admin-primary underline"
                      >
                        Pick as official winner
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrizeEditor({ label, prize, onChange }: { label: string; prize: Prize; onChange: (p: Prize) => void }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-sm font-semibold text-admin-primary">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input
          placeholder="XP"
          type="number"
          value={prize.xp}
          onChange={(e) => onChange({ ...prize, xp: e.target.value })}
        />
        <Input
          placeholder="Badge icon"
          value={prize.badgeIcon}
          onChange={(e) => onChange({ ...prize, badgeIcon: e.target.value })}
        />
        <Input
          placeholder="Badge name"
          value={prize.badgeName}
          onChange={(e) => onChange({ ...prize, badgeName: e.target.value })}
          className="col-span-2"
        />
        <Input
          placeholder="Title name"
          value={prize.titleName}
          onChange={(e) => onChange({ ...prize, titleName: e.target.value })}
          className="col-span-2"
        />
      </div>
    </div>
  );
}
