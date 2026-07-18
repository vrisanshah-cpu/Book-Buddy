"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CardRarity = "common" | "rare" | "legendary";

interface CatalogCard {
  id: string;
  code: string;
  author_name: string;
  fun_fact: string;
  artifact_name: string | null;
  artifact_description: string | null;
  icon: string;
  rarity: CardRarity;
}

interface OwnedCard {
  card_id: string;
  quantity: number;
  serial_codes: string[];
}

const RARITY_ORDER: CardRarity[] = ["legendary", "rare", "common"];

const RARITY_STYLES: Record<CardRarity, { ring: string; badge: string; glow: string }> = {
  common: { ring: "ring-slate-200", badge: "bg-slate-100 text-slate-600", glow: "" },
  rare: { ring: "ring-sky-300", badge: "bg-sky-100 text-sky-700", glow: "shadow-sky-200" },
  legendary: {
    ring: "ring-amber-300",
    badge: "bg-amber-100 text-amber-700",
    glow: "shadow-amber-200",
  },
};

export function CollectionClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogCard[]>([]);
  const [owned, setOwned] = useState<Record<string, OwnedCard>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: catalogRows }, { data: ownedRows }] = await Promise.all([
      supabase
        .from("author_cards")
        .select("id, code, author_name, fun_fact, artifact_name, artifact_description, icon, rarity")
        .order("author_name", { ascending: true }),
      supabase
        .from("user_author_cards")
        .select("card_id, quantity, serial_codes")
        .eq("user_id", userId),
    ]);

    setCatalog((catalogRows as CatalogCard[]) ?? []);

    const ownedMap: Record<string, OwnedCard> = {};
    (ownedRows ?? []).forEach((r) => {
      ownedMap[r.card_id as string] = r as unknown as OwnedCard;
    });
    setOwned(ownedMap);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = [...catalog].sort((a, b) => {
    const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    if (rarityDiff !== 0) return rarityDiff;
    return a.author_name.localeCompare(b.author_name);
  });

  const ownedCount = catalog.filter((c) => owned[c.id]).length;

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Author Card Binder</h1>
      <p className="mt-2 text-slate-600">
        Finish books to collect cards for their authors — new authors always drop a card the first
        time, and weekend events boost your odds!
      </p>
      <p className="mt-1 text-sm font-semibold text-kids-purple">
        {loading ? "…" : `${ownedCount} / ${catalog.length} authors collected`}
      </p>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {sorted.map((c) => {
            const mine = owned[c.id];
            const styles = RARITY_STYLES[c.rarity];
            const isExpanded = expanded === c.id;

            if (!mine) {
              return (
                <div
                  key={c.id}
                  className="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl bg-slate-100 p-4 text-center ring-2 ring-slate-200"
                >
                  <span className="text-4xl opacity-30">❓</span>
                  <p className="mt-2 text-xs font-semibold text-slate-400">Not found yet</p>
                </div>
              );
            }

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setExpanded(isExpanded ? null : c.id)}
                className={`flex flex-col rounded-2xl bg-white p-4 text-left shadow-md ring-2 transition ${styles.ring} ${styles.glow}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{c.icon}</span>
                  {mine.quantity > 1 && (
                    <span className="rounded-full bg-kids-purple px-2 py-0.5 text-xs font-bold text-white">
                      ×{mine.quantity}
                    </span>
                  )}
                </div>
                <p className="mt-2 font-bold text-slate-900">{c.author_name}</p>
                <span className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${styles.badge}`}>
                  {c.rarity}
                </span>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <p>{c.fun_fact}</p>
                    {c.artifact_name && (
                      <p>
                        <span className="font-semibold text-slate-800">🏺 {c.artifact_name}:</span>{" "}
                        {c.artifact_description}
                      </p>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Your copies
                      </p>
                      <ul className="mt-1 space-y-0.5 font-mono text-xs text-slate-500">
                        {mine.serial_codes.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
