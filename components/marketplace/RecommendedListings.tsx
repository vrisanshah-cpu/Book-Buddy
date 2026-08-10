"use client";

import { useState } from "react";
import { ListingCard } from "./ListingCard";
import { Button } from "@/components/ui/Button";
import type { MarketplaceCategory } from "@/lib/marketplace";

interface RecItem {
  listing: { id: string; title: string; category: MarketplaceCategory; price_cents: number; photo_urls: string[] };
  why: string;
}

/** User-initiated (not automatic) — this is a best-effort suggestion
 * feature, so it only calls the AI when someone actually asks for it. */
export function RecommendedListings({ role }: { role: "parent" | "teacher" }) {
  const [recs, setRecs] = useState<RecItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchRecs() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace/recommend", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't get suggestions.");
      setRecs(data.recommendations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-violet-900">✨ Suggested for your reader(s)</p>
        <Button variant="ghost" onClick={fetchRecs} disabled={loading}>
          {loading ? "Thinking…" : recs ? "Refresh" : "Get suggestions"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {recs && recs.length === 0 && (
        <p className="mt-2 text-sm text-violet-700">No great matches yet — browse below instead.</p>
      )}
      {recs && recs.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {recs.map((r) => (
            <ListingCard key={r.listing.id} listing={r.listing} role={role} why={r.why} />
          ))}
        </div>
      )}
    </div>
  );
}
