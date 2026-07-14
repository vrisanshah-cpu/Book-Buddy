"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Rec {
  title: string;
  author: string;
  why: string;
}

export function DiscoverClient() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function loadRecs() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/books/recommend", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setRecs(data.recommendations ?? []);
    } else {
      setError(data.error ?? "Something went wrong.");
    }
  }

  async function addToWantToRead(rec: Rec) {
    const res = await fetch("/api/books/shelf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: rec.title, author: rec.author, status: "want_to_read" }),
    });
    if (res.ok) setAdded((a) => new Set(a).add(rec.title));
  }

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Discover</h1>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Recommended for you</h2>
          <Button variant="kids" className="!text-xs" onClick={loadRecs} disabled={loading}>
            {loading ? "Thinking…" : recs.length ? "Refresh" : "Get recommendations"}
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {recs.map((r) => (
            <div key={r.title} className="rounded-2xl bg-white p-4 shadow-md">
              <p className="font-bold">{r.title}</p>
              <p className="text-sm text-slate-500">{r.author}</p>
              <p className="mt-2 text-sm text-slate-600">{r.why}</p>
              <Button
                variant="secondary"
                className="mt-3 !text-xs"
                onClick={() => addToWantToRead(r)}
                disabled={added.has(r.title)}
              >
                {added.has(r.title) ? "Added ✓" : "+ Want to read"}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}