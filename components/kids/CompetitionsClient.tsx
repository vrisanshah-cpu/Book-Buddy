"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Competition {
  id: string;
  title: string;
  prompt: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "active" | "judging" | "completed";
}
interface Submission {
  id: string;
  title: string;
  content: string;
  ai_feedback: string | null;
  community_votes: number;
  is_winner: boolean;
  stage: "participant" | "semifinalist" | "finalist" | "top_3";
  score: number | null;
  author: { id: string; display_name: string; equipped_title: { name: string } | null } | null;
}
interface Comment {
  id: string;
  submission_id: string;
  comment_text: string;
  author: { id: string; display_name: string } | null;
}

const STATUS_LABEL: Record<Competition["status"], string> = {
  draft: "Coming soon",
  active: "Open for entries",
  judging: "Voting open",
  completed: "Completed",
};
const STATUS_GRADIENT: Record<Competition["status"], string> = {
  draft: "from-slate-400 to-slate-500",
  active: "from-kids-purple to-violet-500",
  judging: "from-kids-teal to-cyan-500",
  completed: "from-kids-yellow to-amber-500",
};
const STAGE_LABEL: Record<Submission["stage"], string> = {
  participant: "Participant",
  semifinalist: "Semifinalist",
  finalist: "Finalist",
  top_3: "🏆 Top 3 Winner",
};
const STAGE_STYLES: Record<Submission["stage"], string> = {
  participant: "bg-slate-100 text-slate-600",
  semifinalist: "bg-sky-100 text-sky-700",
  finalist: "bg-violet-100 text-violet-700",
  top_3: "bg-amber-100 text-amber-700",
};

/** Ticks down to `target` every second — used for the "time left to submit / vote" clock. */
function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "Time's up";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m ${seconds}s left`;
}

function CountdownBadge({ competition }: { competition: Competition }) {
  const target = competition.status === "active" ? competition.ends_at : competition.status === "judging" ? competition.ends_at : null;
  const label = useCountdown(target);
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-xs font-bold text-white">
      ⏱️ {label}
    </span>
  );
}

export function CompetitionsClient({ currentUserId }: { currentUserId: string }) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [myVoteSubmissionId, setMyVoteSubmissionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Competition | null>(null);

  const [storyTitle, setStoryTitle] = useState("");
  const [storyContent, setStoryContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    void loadList();
  }, []);

  async function loadList() {
    setLoading(true);
    const res = await fetch("/api/competitions");
    const data = await res.json().catch(() => ({}));
    setCompetitions(res.ok ? (data.competitions ?? []).filter((c: Competition) => c.status !== "draft") : []);
    setLoading(false);
  }

  async function openCompetition(id: string) {
    setSelectedId(id);
    setError("");
    const res = await fetch(`/api/competitions/${id}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSelected(data.competition);
      setSubmissions(data.submissions ?? []);
      setComments(data.comments ?? []);
      setMyVoteSubmissionId(data.myVoteSubmissionId ?? null);
    }
  }

  async function submitStory() {
    if (!selectedId || !storyTitle.trim() || !storyContent.trim()) return;
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/competitions/${selectedId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: storyTitle.trim(), content: storyContent.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't submit that.");
      return;
    }
    setStoryTitle("");
    setStoryContent("");
    await openCompetition(selectedId);
  }

  async function vote(submissionId: string) {
    if (!selectedId) return;
    setError("");
    const res = await fetch(`/api/competitions/${selectedId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't vote.");
      return;
    }
    await openCompetition(selectedId);
  }

  async function postComment(submissionId: string) {
    if (!selectedId) return;
    const text = commentDrafts[submissionId]?.trim();
    if (!text) return;
    setError("");
    const res = await fetch(`/api/competitions/${selectedId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, commentText: text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "That comment couldn't be posted.");
      return;
    }
    setCommentDrafts((prev) => ({ ...prev, [submissionId]: "" }));
    await openCompetition(selectedId);
  }

  const myOwnSubmission = submissions.find((s) => s.author?.id === currentUserId);
  const top3 = [...submissions].filter((s) => s.stage === "top_3").sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (selectedId && selected) {
    return (
      <div>
        <button type="button" onClick={() => setSelectedId(null)} className="text-sm font-semibold text-kids-purple">
          ← All competitions
        </button>

        <div className={`mt-3 rounded-2xl bg-gradient-to-br ${STATUS_GRADIENT[selected.status]} p-5 text-white shadow-lg`}>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-kids-display text-2xl font-bold">{selected.title}</h1>
            <CountdownBadge competition={selected} />
          </div>
          <p className="mt-2 text-sm opacity-90">{selected.prompt}</p>
          {myOwnSubmission && (
            <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${STAGE_STYLES[myOwnSubmission.stage]}`}>
              Your entry: {STAGE_LABEL[myOwnSubmission.stage]}
            </span>
          )}
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {selected.status === "completed" && top3.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-md">
            <h2 className="font-kids-display text-lg font-bold text-slate-900">🏆 Leaderboard</h2>
            <div className="mt-3 space-y-2">
              {top3.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl bg-amber-50 p-3">
                  <span className="text-2xl">{["🥇", "🥈", "🥉"][i] ?? "🏅"}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {s.title} <span className="font-normal text-slate-500">by {s.author?.display_name}</span>
                    </p>
                    {s.score !== null && <p className="text-xs text-slate-500">Score: {s.score}/100</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected.status === "active" && !myOwnSubmission && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-md">
            <h2 className="font-semibold text-slate-900">Submit your story</h2>
            <Input placeholder="Title" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} className="mt-2" />
            <textarea
              value={storyContent}
              onChange={(e) => setStoryContent(e.target.value)}
              placeholder="Write your story here…"
              rows={8}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2"
            />
            <Button variant="kids" className="mt-2" disabled={submitting} onClick={submitStory}>
              {submitting ? "Submitting…" : "Submit story"}
            </Button>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {submissions.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white p-5 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {s.title}{" "}
                    <span className="font-normal text-slate-500">
                      by {s.author?.display_name}
                      {s.author?.equipped_title && <span className="text-violet-500"> · {s.author.equipped_title.name}</span>}
                    </span>
                    {s.is_winner && <span className="ml-2 text-emerald-600">🏆</span>}
                  </p>
                  {selected.status !== "active" && (
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STAGE_STYLES[s.stage]}`}>
                      {STAGE_LABEL[s.stage]}
                    </span>
                  )}
                </div>
                {selected.status === "judging" && s.author?.id !== currentUserId && (
                  <button
                    type="button"
                    disabled={myVoteSubmissionId !== null}
                    onClick={() => vote(s.id)}
                    className={`shrink-0 text-xs font-semibold ${
                      myVoteSubmissionId === s.id ? "text-emerald-600" : "text-kids-purple hover:text-violet-700"
                    }`}
                  >
                    {myVoteSubmissionId === s.id ? "✓ Your vote" : `❤️ Vote (${s.community_votes})`}
                  </button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{s.content}</p>
              {s.author?.id === currentUserId && s.ai_feedback && (
                <p className="mt-3 rounded-lg bg-violet-50 p-3 text-sm text-violet-800">🤖 {s.ai_feedback}</p>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3">
                {comments
                  .filter((c) => c.submission_id === s.id)
                  .map((c) => (
                    <p key={c.id} className="py-1 text-sm text-slate-600">
                      <span className="font-semibold">{c.author?.display_name}:</span> {c.comment_text}
                    </p>
                  ))}
                <div className="mt-2 flex gap-2">
                  <input
                    value={commentDrafts[s.id] ?? ""}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Leave a kind comment…"
                    className="min-h-[40px] flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => postComment(s.id)}
                    className="min-h-[40px] rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold text-slate-900">Writing Competitions</h1>
      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {competitions.length === 0 && (
            <p className="col-span-2 text-center text-slate-500">No competitions right now — check back soon!</p>
          )}
          {competitions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openCompetition(c.id)}
              className="text-left"
            >
              <div className={`rounded-2xl bg-gradient-to-br ${STATUS_GRADIENT[c.status]} p-5 text-white shadow-md transition hover:shadow-lg`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-bold">{STATUS_LABEL[c.status]}</span>
                  <CountdownBadge competition={c} />
                </div>
                <h3 className="font-kids-display mt-3 text-xl font-bold">{c.title}</h3>
                <p className="mt-1 text-sm opacity-90 line-clamp-2">{c.prompt}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
