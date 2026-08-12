"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type GoalType = "books_count" | "genre_diversity" | "author_prefix" | "topic";

interface CreatedEvent {
  id: string;
  title: string;
  description: string;
  goal_type: GoalType;
  goal_config: { target?: number; prefix?: string; topic?: string };
  starts_at: string;
  ends_at: string;
  status: string;
}
interface Theme {
  emoji: string;
  gradient: string;
  accent: string;
}

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "books_count", label: "Finish N books" },
  { value: "genre_diversity", label: "Finish books from N different genres" },
  { value: "author_prefix", label: "Finish a book by an author starting with…" },
  { value: "topic", label: "Finish N books about a topic" },
];

export function AdminReadingEventCreator() {
  const [goalType, setGoalType] = useState<GoalType>("books_count");
  const [target, setTarget] = useState("2");
  const [prefix, setPrefix] = useState("");
  const [topic, setTopic] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [aiUsed, setAiUsed] = useState(true);

  async function generate() {
    setError("");
    setCreated(null);
    setGenerating(true);
    const res = await fetch("/api/admin/reading-events/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalType,
        target: target ? Number(target) : undefined,
        prefix: prefix || undefined,
        topic: topic || undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        rawNotes: rawNotes.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setGenerating(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't generate that.");
      return;
    }
    setCreated(data.event);
    setTheme(data.theme);
    setAiUsed(data.aiUsed);
    setRawNotes("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-admin-primary">AI Weekend Event Creator</h1>
      <p className="mt-1 text-admin-muted">
        This creates a real weekend event on the <strong>Events</strong> page (/kids/events) — a different system from the
        Challenges page. Pick the goal and every number yourself; AI only writes the title and description around it.
      </p>

      <div className="mt-6 grid gap-3 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2">
        <select
          value={goalType}
          onChange={(e) => setGoalType(e.target.value as GoalType)}
          className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
        >
          {GOAL_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        {(goalType === "books_count" || goalType === "genre_diversity" || goalType === "topic") && (
          <Input
            type="number"
            min={1}
            max={10}
            placeholder="Target (1-10)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        )}
        {goalType === "topic" && (
          <Input placeholder="Topic, e.g. 'dinosaurs'" value={topic} onChange={(e) => setTopic(e.target.value)} />
        )}
        {goalType === "author_prefix" && (
          <Input
            placeholder="Letter(s), e.g. 'S'"
            maxLength={3}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        )}

        <Input
          label="Starts"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <Input label="Ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />

        <textarea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="Theme, tone, anything else — e.g. 'space themed, playful and silly'"
          rows={3}
          className="sm:col-span-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2"
        />
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <Button
          className="sm:col-span-2"
          disabled={generating || !rawNotes.trim() || !startsAt || !endsAt}
          onClick={generate}
        >
          {generating ? "Generating…" : "Generate & create event"}
        </Button>
      </div>

      {created && theme && (
        <div className={`mt-6 rounded-2xl bg-gradient-to-br ${theme.gradient} p-6 text-white shadow-md`}>
          <p className="text-xs font-semibold uppercase opacity-80">
            {aiUsed ? "AI-generated" : "Created with fallback copy (no AI key configured)"} · status: {created.status}
          </p>
          <div className="mt-2 flex items-start gap-3">
            <span className="text-4xl">{theme.emoji}</span>
            <div>
              <h2 className="font-bold">{created.title}</h2>
              <p className="mt-1 text-sm opacity-90">{created.description}</p>
            </div>
          </div>
          <p className="mt-3 text-xs opacity-80">Live now on /kids/events — this is exactly how kids will see it.</p>
        </div>
      )}
    </div>
  );
}
