"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Competition {
  id: string;
  title: string;
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
  admin_feedback: string | null;
  created_at: string;
  author: { id: string; display_name: string; email: string | null } | null;
}
interface Contact {
  submissionId: string;
  submissionTitle: string;
  score: number | null;
  studentId: string | null;
  studentName: string;
  studentEmail: string | null;
  parentEmails: string[];
}

const STAGE_LABEL: Record<Submission["stage"], string> = {
  participant: "Participant",
  semifinalist: "Semifinalist",
  finalist: "Finalist",
  top_3: "Top 3 Winner",
};
const STAGE_ORDER: Submission["stage"][] = ["participant", "semifinalist", "finalist", "top_3"];
const STAGE_STYLES: Record<Submission["stage"], string> = {
  participant: "bg-slate-100 text-slate-600",
  semifinalist: "bg-sky-100 text-sky-700",
  finalist: "bg-violet-100 text-violet-700",
  top_3: "bg-amber-100 text-amber-700",
};

export function AdminWritingJudgeClient() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionId] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stageFilter, setStageFilter] = useState<Submission["stage"] | "all">("all");
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [draftScore, setDraftScore] = useState("");
  const [draftFeedback, setDraftFeedback] = useState("");
  const [draftStage, setDraftStage] = useState<Submission["stage"]>("participant");

  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    void loadCompetitions();
  }, []);

  useEffect(() => {
    if (competitionId) void loadSubmissions(competitionId);
    else setSubmissions([]);
    setOpenId(null);
    setContacts(null);
  }, [competitionId]);

  async function loadCompetitions() {
    const res = await fetch("/api/competitions");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setCompetitions(data.competitions ?? []);
  }

  async function loadSubmissions(id: string) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/writing-submissions?competitionId=${id}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) setSubmissions(data.submissions ?? []);
    else setError(data.error ?? "Couldn't load submissions.");
    setLoading(false);
  }

  function openEntry(s: Submission) {
    setOpenId(s.id);
    setDraftScore(s.score?.toString() ?? "");
    setDraftFeedback(s.admin_feedback ?? "");
    setDraftStage(s.stage);
  }

  async function save(id: string) {
    setSaving(true);
    setError("");
    const score = draftScore.trim() === "" ? null : Number(draftScore);
    const res = await fetch(`/api/admin/writing-submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: draftStage, score, adminFeedback: draftFeedback }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't save that.");
      return;
    }
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, stage: draftStage, score, admin_feedback: draftFeedback || null } : s))
    );
    setOpenId(null);
  }

  async function loadContacts() {
    if (!competitionId) return;
    setLoadingContacts(true);
    const res = await fetch(`/api/admin/writing-submissions/top3-contacts?competitionId=${competitionId}`);
    const data = await res.json().catch(() => ({}));
    setLoadingContacts(false);
    if (res.ok) setContacts(data.contacts ?? []);
  }

  function downloadContactsCsv() {
    if (!contacts || contacts.length === 0) return;
    const header = "Student Name,Student Email,Parent Email(s),Submission Title,Score";
    const rows = contacts.map((c) =>
      [c.studentName, c.studentEmail ?? "", c.parentEmails.join("; "), c.submissionTitle, c.score ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "top3-winners-contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const visible = submissions.filter((s) => stageFilter === "all" || s.stage === stageFilter);
  const openSubmission = submissions.find((s) => s.id === openId) ?? null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-admin-primary">Judge Writing Entries</h1>
      <p className="mt-1 text-admin-muted">Read submissions, score them, and move entries through Participant → Semifinalist → Finalist → Top 3.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={competitionId}
          onChange={(e) => setCompetitionId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
        >
          <option value="">Select a competition…</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.status})
            </option>
          ))}
        </select>

        {competitionId && (
          <div className="flex flex-wrap gap-2">
            {(["all", ...STAGE_ORDER] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStageFilter(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  stageFilter === s ? "bg-admin-primary text-white" : "bg-white text-slate-600 shadow-sm"
                }`}
              >
                {s === "all" ? "All" : STAGE_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {competitionId && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-admin-primary">Top 3 prize contacts</p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={loadingContacts} onClick={loadContacts}>
                {loadingContacts ? "Loading…" : "Load top 3 contacts"}
              </Button>
              {contacts && contacts.length > 0 && (
                <Button variant="secondary" onClick={downloadContactsCsv}>
                  Download CSV
                </Button>
              )}
            </div>
          </div>
          {contacts && contacts.length === 0 && (
            <p className="mt-2 text-sm text-admin-muted">No submissions are marked Top 3 for this competition yet.</p>
          )}
          {contacts && contacts.length > 0 && (
            <div className="mt-3 space-y-2">
              {contacts.map((c) => (
                <div key={c.submissionId} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <p className="font-semibold text-admin-primary">
                    {c.studentName} — &quot;{c.submissionTitle}&quot; {c.score !== null && <span className="text-admin-muted">({c.score}/100)</span>}
                  </p>
                  <p className="text-admin-muted">Student: {c.studentEmail ?? "no email on file"}</p>
                  <p className="text-admin-muted">
                    Parent(s): {c.parentEmails.length > 0 ? c.parentEmails.join(", ") : "no parent linked"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm text-admin-muted">Loading…</p>}
        {!loading && competitionId && visible.length === 0 && (
          <p className="text-sm text-admin-muted">No entries at this stage.</p>
        )}
        {visible.map((s) => (
          <div key={s.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-admin-primary">
                  {s.title} <span className="font-normal text-admin-muted">by {s.author?.display_name ?? "Unknown"}</span>
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${STAGE_STYLES[s.stage]}`}>{STAGE_LABEL[s.stage]}</span>
                  {s.score !== null && <span className="text-admin-muted">Score: {s.score}/100</span>}
                  <span className="text-admin-muted">❤️ {s.community_votes}</span>
                  {s.is_winner && <span className="text-emerald-600">🏆 official/community winner</span>}
                </div>
              </div>
              <Button variant="secondary" onClick={() => openEntry(s)}>
                {openId === s.id ? "Editing…" : "Read & judge"}
              </Button>
            </div>

            {openSubmission?.id === s.id && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {s.content}
                </p>
                {s.ai_feedback && <p className="mt-2 text-xs text-admin-muted">AI feedback given to student: {s.ai_feedback}</p>}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Stage</label>
                    <select
                      value={draftStage}
                      onChange={(e) => setDraftStage(e.target.value as Submission["stage"])}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
                    >
                      {STAGE_ORDER.map((st) => (
                        <option key={st} value={st}>
                          {STAGE_LABEL[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Score (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={draftScore}
                      onChange={(e) => setDraftScore(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
                    />
                  </div>
                </div>
                <textarea
                  value={draftFeedback}
                  onChange={(e) => setDraftFeedback(e.target.value)}
                  placeholder="Feedback for the student (optional)"
                  rows={3}
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2"
                />
                <div className="mt-3 flex gap-2">
                  <Button disabled={saving} onClick={() => save(s.id)}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="ghost" onClick={() => setOpenId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
