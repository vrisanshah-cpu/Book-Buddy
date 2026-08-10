"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CharacterCanvas } from "@/components/kids/CharacterCanvas";
import { SLOT_TAB_ORDER, SLOT_LABELS, type CosmeticItem, type CosmeticSlot } from "@/lib/character";

const RARITY_STYLES: Record<CosmeticItem["rarity"], string> = {
  common: "bg-slate-100 text-slate-600",
  rare: "bg-sky-100 text-sky-700",
  epic: "bg-violet-100 text-violet-700",
  legendary: "bg-amber-100 text-amber-700",
};

export function CharacterClient() {
  const [items, setItems] = useState<CosmeticItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<Partial<Record<CosmeticSlot, CosmeticItem | null>>>({});
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<CosmeticSlot>("background");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/kids/character");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items ?? []);
      setOwnedIds(new Set(data.ownedIds ?? []));
      setEquipped(data.equipped ?? {});
      setXp(data.xp ?? 0);
    }
    setLoading(false);
  }

  async function buy(item: CosmeticItem) {
    setMessage("");
    setBusyItemId(item.id);
    const res = await fetch("/api/kids/character/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyItemId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Couldn't buy that.");
      return;
    }
    setXp(data.newXp);
    setOwnedIds((prev) => new Set(prev).add(item.id));
  }

  async function equip(item: CosmeticItem) {
    setMessage("");
    setBusyItemId(item.id);
    const res = await fetch("/api/kids/character/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot: item.slot, itemId: item.id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyItemId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Couldn't equip that.");
      return;
    }
    setEquipped((prev) => ({ ...prev, [item.slot]: item }));
  }

  const visibleItems = items.filter((i) => i.slot === activeSlot);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-kids-display text-2xl font-bold text-slate-900">My Character</h1>
        <span className="rounded-full bg-kids-yellow px-3 py-1.5 text-sm font-bold text-slate-900">✨ {xp} XP</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
        <CharacterCanvas equipped={equipped} />

        <div>
          <div className="flex flex-wrap gap-2">
            {SLOT_TAB_ORDER.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setActiveSlot(slot)}
                className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${
                  activeSlot === slot ? "bg-kids-purple text-white" : "bg-white text-slate-600 shadow-sm"
                }`}
              >
                {SLOT_LABELS[slot]}
              </button>
            ))}
          </div>

          {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading && <p className="text-sm text-slate-400">Loading…</p>}
            {!loading && visibleItems.length === 0 && (
              <p className="text-sm text-slate-400">Nothing here yet — check back for a monthly drop!</p>
            )}
            {visibleItems.map((item) => {
              const owned = item.is_starter || ownedIds.has(item.id);
              const canAfford = xp >= item.xp_cost;
              const isEquipped = equipped[item.slot]?.id === item.id;
              const busy = busyItemId === item.id;

              return (
                <div key={item.id} className="rounded-2xl bg-white p-3 shadow-md">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- fixed cosmetic art thumbnail */}
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" draggable={false} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RARITY_STYLES[item.rarity]}`}>
                      {item.rarity}
                    </span>
                  </div>
                  {owned ? (
                    <Button
                      variant={isEquipped ? "secondary" : "kids"}
                      className="mt-2 w-full !text-sm"
                      disabled={isEquipped || busy}
                      onClick={() => equip(item)}
                    >
                      {isEquipped ? "Equipped" : busy ? "Equipping…" : "Equip"}
                    </Button>
                  ) : (
                    <Button
                      variant="kids"
                      className={`mt-2 w-full !text-sm ${!canAfford ? "opacity-40" : ""}`}
                      disabled={!canAfford || busy}
                      onClick={() => buy(item)}
                    >
                      {busy ? "Buying…" : canAfford ? `Buy — ${item.xp_cost} XP` : `${item.xp_cost} XP`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
