"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { CategoryBadge } from "./CategoryBadge";
import { formatPriceCents, type MarketplaceCategory } from "@/lib/marketplace";

interface OwnListing {
  id: string;
  title: string;
  category: MarketplaceCategory;
  price_cents: number;
  status: "active" | "inactive";
}

const LINK_COLOR: Record<"parent" | "teacher", string> = {
  parent: "text-parent-primary",
  teacher: "text-teacher-primary",
};

export function MyListingsPanel({ role }: { role: "parent" | "teacher" }) {
  const [listings, setListings] = useState<OwnListing[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("marketplace_listings")
      .select("id, title, category, price_cents, status")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    setListings(data ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleStatus(id: string, current: "active" | "inactive") {
    setBusyId(id);
    await fetch(`/api/marketplace/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "active" ? "inactive" : "active" }),
    });
    await load();
    setBusyId(null);
  }

  if (listings === null) return <p className="text-sm text-slate-500">Loading your listings…</p>;
  if (listings.length === 0) return <p className="text-sm text-slate-500">You haven&apos;t listed anything yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {listings.map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <p className="font-medium text-slate-900">{l.title}</p>
            <div className="mt-1 flex items-center gap-2">
              <CategoryBadge category={l.category} />
              <span className="text-xs text-slate-500">{formatPriceCents(l.price_cents)}</span>
              <span className={`text-xs font-medium ${l.status === "active" ? "text-emerald-600" : "text-slate-400"}`}>
                {l.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/${role}/marketplace/sell/${l.id}`} className={`text-sm font-medium hover:underline ${LINK_COLOR[role]}`}>
              Edit
            </Link>
            <Button variant="secondary" disabled={busyId === l.id} onClick={() => toggleStatus(l.id, l.status)}>
              {l.status === "active" ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
