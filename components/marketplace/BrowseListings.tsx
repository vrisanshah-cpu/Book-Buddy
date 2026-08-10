"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ListingCard } from "./ListingCard";
import { RecommendedListings } from "./RecommendedListings";
import { MARKETPLACE_CATEGORIES, CATEGORY_LABELS, type MarketplaceCategory } from "@/lib/marketplace";

interface Listing {
  id: string;
  title: string;
  category: MarketplaceCategory;
  price_cents: number;
  photo_urls: string[];
}

/** Category filter + search are plain client-side state (not URL params) —
 * the marketplace is expected to be small enough for this MVP that a
 * single fetch + local filter is simpler than wiring up server-side
 * pagination and shareable filter URLs. */
export function BrowseListings({ role }: { role: "parent" | "teacher" }) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [category, setCategory] = useState<MarketplaceCategory | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("marketplace_listings")
      .select("id, title, category, price_cents, photo_urls")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => setListings(data ?? []));
  }, []);

  const filtered = (listings ?? []).filter((l) => {
    if (category !== "all" && l.category !== category) return false;
    if (query && !l.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <RecommendedListings role={role} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings…"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          onClick={() => setCategory("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            category === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          All
        </button>
        {MARKETPLACE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              category === c ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {listings === null ? (
        <p className="text-sm text-slate-500">Loading listings…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No listings match yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
