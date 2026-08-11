"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface CreatedChallenge {
  id: string;
  title: string;
  description: string | null;
  tagline: string | null;
  badge_icon: string | null;
  target_value: number;
  type: string;
}

const TYPE_OPTIONS = [
  { value: "reading_streak", label: "Reading streak (days in a row)" },
  { value: "books_finished", label: "Books finished" },
  { value: "minutes_read", label: "Minutes read" },
  { value: "quiz_score", label: "Quiz score" },
];

export function AdminReadingChallengeCreator() {
  const [type, setType] = useState("books_finished");
  const [targetValue, setTargetValue] = useState("5");
  const [rawNotes, setRawNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedChallenge | null>(null);
  const [aiUsed, setAiUsed] = useState(true);

  async function generate() {
    setError("");
    setCreated(null);
    setGenerating(true);
    const res = await fetch("/api/admin/reading-challenges/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        targetValue: Number(targetValue),
        rawNotes: rawNotes.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setGenerating(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't generate that.");
      return;
    }
    setCreated(data.challenge);
    setAiUsed(data.aiUsed);
    setRawNotes("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-admin-primary">AI Reading Competition Creator</h1>
      <p className="mt-1 text-admin-muted">
        Give the facts — type, target, dates, theme notes — and the AI writes the title, description, tagline, and badge. It
        never changes the numbers, only the copy.
      </p>

      <div className="mt-6 grid gap-3 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <Input type="number" min={1} placeholder="Target value" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
        <Input label="Start date (optional)" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="End date (optional)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <textarea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="Theme, age group, tone, any rules — e.g. 'Halloween-themed, grades 3-5, spooky books count double, encouraging tone'"
          rows={4}
          className="sm:col-span-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2"
        />
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <Button className="sm:col-span-2" disabled={generating || !rawNotes.trim()} onClick={generate}>
          {generating ? "Generating…" : "Generate & create competition"}
        </Button>
      </div>

      {created && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-admin-muted">
            {aiUsed ? "AI-generated" : "Created with fallback copy (no AI key configured)"}
          </p>
          <div className="mt-2 flex items-start gap-3">
            <span className="text-4xl">{created.badge_icon ?? "🏆"}</span>
            <div>
              <h2 className="font-bold text-admin-primary">{created.title}</h2>
              {created.tagline && <p className="text-sm font-semibold text-violet-600">{created.tagline}</p>}
              <p className="mt-1 text-sm text-admin-muted">{created.description}</p>
              <p className="mt-1 text-xs text-admin-muted">
                Target: {created.target_value} · {created.type.replace("_", " ")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-admin-muted">
            Live now — kids will see this on their Challenges page (or their classroom's, if you scoped it to one).
          </p>
        </div>
      )}
    </div>
  );
}
