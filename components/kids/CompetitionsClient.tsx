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
  author: { id: string; display_name: string } | null;
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

  if (selectedId && selected) {
    return (
      <div>
        <button type="button" onClick={() => setSelectedId(null)} className="text-sm font-semibold text-kids-purple">
          ← All competitions
        </button>
        <h1 className="font-kids-display mt-2 text-2xl font-bold text-slate-900">{selected.title}</h1>
        <p className="mt-1 text-slate-600">{selected.prompt}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

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
                <p className="font-semibold text-slate-900">
                  {s.title} <span className="font-normal text-slate-500">by {s.author?.display_name}</span>
                  {s.is_winner && <span className="ml-2 text-emerald-600">🏆</span>}
                </p>
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
      <h1 className="font-kids-display text-2xl font-bold text-slate-900">Writing Competitions</h1>
      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && competitions.length === 0 && (
          <p className="text-sm text-slate-400">No competitions right now — check back soon!</p>
        )}
        {competitions.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openCompetition(c.id)}
            className="block w-full rounded-2xl bg-white p-5 text-left shadow-md hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">{c.title}</p>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{c.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
