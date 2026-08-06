"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type GoalType = "books_count" | "genre_diversity" | "author_prefix" | "topic";

interface ClassroomEvent {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  goal_type: GoalType;
  goal_config: { target?: number; prefix?: string; topic?: string };
  starts_at: string;
  ends_at: string;
  status: "upcoming" | "active" | "closed";
}

interface Classroom {
  id: string;
  name: string;
}

/**
 * Lets a teacher create a reading challenge for one classroom (same goal
 * types as platform weekend events — books_count, genre_diversity,
 * author_prefix, topic — validated server-side by validateGoalSpec) and
 * see the classroom's existing events. Events auto-activate/close on the
 * next load (see lib/classroom-events.ts) rather than a cron job.
 */
export function ClassroomEventsClient({ classrooms }: { classrooms: Classroom[] }) {
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? "");
  const [events, setEvents] = useState<ClassroomEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("books_count");
  const [target, setTarget] = useState("3");
  const [prefix, setPrefix] = useState("");
  const [topic, setTopic] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (classroomId) void loadEvents(classroomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  async function loadEvents(id: string) {
    setLoading(true);
    const res = await fetch(`/api/classroom-events?classroomId=${id}`);
    const data = await res.json().catch(() => ({}));
    setEvents(res.ok ? data.events ?? [] : []);
    setLoading(false);
  }

  async function createEvent() {
    setError("");
    if (!classroomId || !title.trim() || !description.trim() || !startsAt || !endsAt) {
      setError("Fill in every field.");
      return;
    }
    if (goalType === "author_prefix" && !prefix.trim()) {
      setError("Enter a starting letter or letters.");
      return;
    }
    if (goalType === "topic" && !topic.trim()) {
      setError("Enter a topic.");
      return;
    }

    const goalConfig: Record<string, unknown> =
      goalType === "author_prefix"
        ? { prefix: prefix.trim() }
        : goalType === "topic"
        ? { topic: topic.trim(), target: Number(target) }
        : { target: Number(target) };

    setCreating(true);
    const res = await fetch("/api/classroom-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classroomId,
        title: title.trim(),
        description: description.trim(),
        goal_type: goalType,
        goal_config: goalConfig,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't create that event.");
    } else {
      setTitle("");
      setDescription("");
      setPrefix("");
      setTopic("");
      setStartsAt("");
      setEndsAt("");
      await loadEvents(classroomId);
    }
    setCreating(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Classroom Events</h1>
      <p className="mt-1 text-teacher-muted">Create a reading challenge for your class, just like weekend events.</p>

      {classrooms.length === 0 ? (
        <p className="mt-6 text-sm text-teacher-muted">Create a classroom first, then you can set up events for it.</p>
      ) : (
        <>
          {classrooms.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {classrooms.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClassroomId(c.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    classroomId === c.id ? "bg-teacher-primary text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">New event</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-violet-400 focus:ring-2"
              >
                <option value="books_count">Finish N books</option>
                <option value="genre_diversity">Finish books from N genres</option>
                <option value="author_prefix">Finish a book by an author starting with…</option>
                <option value="topic">Finish N books about a topic</option>
              </select>
              <Input
                className="sm:col-span-2"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {goalType === "author_prefix" ? (
                <Input placeholder="Starting letter(s), e.g. A" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
              ) : (
                <Input
                  type="number"
                  min={1}
                  max={10}
                  placeholder="Target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              )}
              {goalType === "topic" && (
                <Input placeholder="Topic, e.g. space" value={topic} onChange={(e) => setTopic(e.target.value)} />
              )}
              <label className="text-sm text-slate-600">
                Starts
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2"
                />
              </label>
              <label className="text-sm text-slate-600">
                Ends
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2"
                />
              </label>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <Button variant="secondary" className="mt-4" onClick={createEvent} disabled={creating}>
              {creating ? "Creating…" : "Create event"}
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-teacher-muted">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-teacher-muted">No events yet for this classroom.</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{ev.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        ev.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : ev.status === "upcoming"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-teacher-muted">{ev.description}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
