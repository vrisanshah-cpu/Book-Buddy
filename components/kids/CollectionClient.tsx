"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { RARITY_TIERS, type CardRarity, type CardCategory } from "@/lib/author-cards";

interface CatalogAuthorCard {
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
  card: {
    id: string;
    category: CardCategory;
    author_name: string;
    fun_fact: string;
    artifact_name: string | null;
    artifact_description: string | null;
    icon: string;
    rarity: CardRarity;
  } | null;
}

const RARITY_ORDER = [...RARITY_TIERS].reverse(); // divine first, common last

const RARITY_THEME: Record<CardRarity, { ring: string; badge: string; glowClass: string }> = {
  common: { ring: "ring-slate-300", badge: "bg-slate-100 text-slate-600", glowClass: "card-rarity-common" },
  uncommon: { ring: "ring-emerald-300", badge: "bg-emerald-100 text-emerald-700", glowClass: "card-rarity-uncommon" },
  rare: { ring: "ring-sky-300", badge: "bg-sky-100 text-sky-700", glowClass: "card-rarity-rare" },
  epic: { ring: "ring-violet-300", badge: "bg-violet-100 text-violet-700", glowClass: "card-rarity-epic" },
  legendary: { ring: "ring-amber-300", badge: "bg-amber-100 text-amber-700", glowClass: "card-rarity-legendary" },
  mythic: { ring: "ring-rose-300", badge: "bg-rose-100 text-rose-700", glowClass: "card-rarity-mythic" },
  ethereal: { ring: "ring-teal-300", badge: "bg-teal-100 text-teal-700", glowClass: "card-rarity-ethereal" },
  divine: { ring: "ring-fuchsia-300", badge: "bg-fuchsia-100 text-fuchsia-700", glowClass: "card-rarity-divine" },
};

const HOLO_TIERS: CardRarity[] = ["mythic", "ethereal", "divine"];

type Tab = "authors" | "items" | "locations";

export function CollectionClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("authors");
  const [loading, setLoading] = useState(true);
  const [authorCatalog, setAuthorCatalog] = useState<CatalogAuthorCard[]>([]);
  const [ownedAuthors, setOwnedAuthors] = useState<Record<string, OwnedCard>>({});
  const [ownedItems, setOwnedItems] = useState<OwnedCard[]>([]);
  const [ownedLocations, setOwnedLocations] = useState<OwnedCard[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: catalogRows }, { data: ownedRows }] = await Promise.all([
      supabase
        .from("author_cards")
        .select("id, code, author_name, fun_fact, artifact_name, artifact_description, icon, rarity")
        .eq("category", "author")
        .order("author_name", { ascending: true }),
      supabase
        .from("user_author_cards")
        .select(
          "card_id, quantity, serial_codes, card:author_cards(id, category, author_name, fun_fact, artifact_name, artifact_description, icon, rarity)"
        )
        .eq("user_id", userId),
    ]);

    setAuthorCatalog((catalogRows as CatalogAuthorCard[]) ?? []);

    const authorMap: Record<string, OwnedCard> = {};
    const items: OwnedCard[] = [];
    const locations: OwnedCard[] = [];

    (ownedRows ?? []).forEach((r) => {
      const cardRaw = r.card;
      const card = (Array.isArray(cardRaw) ? cardRaw[0] : cardRaw) ?? null;
      const row: OwnedCard = {
        card_id: r.card_id as string,
        quantity: r.quantity as number,
        serial_codes: r.serial_codes as string[],
        card,
      };
      if (card?.category === "author") authorMap[row.card_id] = row;
      else if (card?.category === "item") items.push(row);
      else if (card?.category === "location") locations.push(row);
    });

    setOwnedAuthors(authorMap);
    setOwnedItems(items);
    setOwnedLocations(locations);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedAuthors = [...authorCatalog].sort((a, b) => {
    const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    if (rarityDiff !== 0) return rarityDiff;
    return a.author_name.localeCompare(b.author_name);
  });

  const sortByRarity = (cards: OwnedCard[]) =>
    [...cards].sort((a, b) => RARITY_ORDER.indexOf(a.card!.rarity) - RARITY_ORDER.indexOf(b.card!.rarity));

  const ownedAuthorCount = authorCatalog.filter((c) => ownedAuthors[c.id]).length;
  const activeOwnedList = tab === "items" ? ownedItems : tab === "locations" ? ownedLocations : [];

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Collection</h1>
      <p className="mt-2 text-slate-600">
        Finish books to collect cards — new authors always drop a card the first time. After that, keep
        reading their other books to dig up items and locations from their stories instead.
      </p>

      <div className="mt-4 flex gap-2">
        {(
          [
            { key: "authors", label: "Authors" },
            { key: "items", label: "Items" },
            { key: "locations", label: "Locations" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "bg-kids-purple text-white" : "bg-white text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "authors" && (
        <p className="mt-3 text-sm font-semibold text-kids-purple">
          {loading ? "…" : `${ownedAuthorCount} / ${authorCatalog.length} authors collected`}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : tab === "authors" ? (
        <CardGrid>
          {sortedAuthors.map((c) => {
            const mine = ownedAuthors[c.id];
            return (
              <CollectibleTile
                key={c.id}
                icon={c.icon}
                name={c.author_name}
                rarity={c.rarity}
                funFact={c.fun_fact}
                artifactName={c.artifact_name}
                artifactDescription={c.artifact_description}
                quantity={mine?.quantity}
                serialCodes={mine?.serial_codes}
                locked={!mine}
                expanded={expanded === c.id}
                onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
              />
            );
          })}
        </CardGrid>
      ) : (
        <CardGrid>
          {sortByRarity(activeOwnedList).map((o) => (
            <CollectibleTile
              key={o.card_id}
              icon={o.card!.icon}
              name={o.card!.author_name}
              rarity={o.card!.rarity}
              funFact={o.card!.fun_fact}
              artifactName={o.card!.artifact_name}
              artifactDescription={o.card!.artifact_description}
              quantity={o.quantity}
              serialCodes={o.serial_codes}
              locked={false}
              expanded={expanded === o.card_id}
              onToggle={() => setExpanded(expanded === o.card_id ? null : o.card_id)}
            />
          ))}
          {activeOwnedList.length === 0 && (
            <p className="col-span-full text-center text-slate-500">
              Nothing found yet — keep reading books by authors you've already unlocked!
            </p>
          )}
        </CardGrid>
      )}
    </div>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{children}</div>;
}

function CollectibleTile({
  icon,
  name,
  rarity,
  funFact,
  artifactName,
  artifactDescription,
  quantity,
  serialCodes,
  locked,
  expanded,
  onToggle,
}: {
  icon: string;
  name: string;
  rarity: CardRarity;
  funFact: string;
  artifactName: string | null;
  artifactDescription: string | null;
  quantity?: number;
  serialCodes?: string[];
  locked: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (locked) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl bg-slate-100 p-4 text-center ring-2 ring-slate-200">
        <span className="text-4xl opacity-30">❓</span>
        <p className="mt-2 text-xs font-semibold text-slate-400">Not found yet</p>
      </div>
    );
  }

  const theme = RARITY_THEME[rarity];
  const holo = HOLO_TIERS.includes(rarity);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex flex-col rounded-2xl bg-white p-4 text-left shadow-md ring-2 transition ${theme.ring} ${holo ? "card-holo" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-4xl">{icon}</span>
        {quantity && quantity > 1 && (
          <span className="rounded-full bg-kids-purple px-2 py-0.5 text-xs font-bold text-white">×{quantity}</span>
        )}
      </div>
      <p className="mt-2 font-bold text-slate-900">{name}</p>
      <span className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${theme.badge}`}>
        {rarity}
      </span>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <p>{funFact}</p>
          {artifactName && (
            <p>
              <span className="font-semibold text-slate-800">🏺 {artifactName}:</span> {artifactDescription}
            </p>
          )}
          {serialCodes && serialCodes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your copies</p>
              <ul className="mt-1 space-y-0.5 font-mono text-xs text-slate-500">
                {serialCodes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
