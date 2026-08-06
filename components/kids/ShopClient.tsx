"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Category = "avatar_accessory" | "shelf_theme" | "pet" | "xp_booster" | "streak_freeze";

interface ShopItem {
  id: string;
  code: string;
  name: string;
  category: Category;
  icon_or_asset: string;
  xp_cost: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const CATEGORY_LABELS: Record<Category, string> = {
  avatar_accessory: "Accessories",
  shelf_theme: "Shelf Themes",
  pet: "Book Pets",
  xp_booster: "Boosters",
  streak_freeze: "Streak Freezes",
};

const CATEGORY_ORDER: Category[] = ["avatar_accessory", "shelf_theme", "pet", "xp_booster", "streak_freeze"];
const EQUIPPABLE = new Set<Category>(["avatar_accessory", "shelf_theme", "pet"]);

const RARITY_STYLES: Record<ShopItem["rarity"], string> = {
  common: "bg-slate-100 text-slate-600",
  rare: "bg-sky-100 text-sky-700",
  epic: "bg-violet-100 text-violet-700",
  legendary: "bg-amber-100 text-amber-700",
};

export function ShopClient({
  xp: initialXp,
  items,
  owned: initialOwned,
  equipped: initialEquipped,
}: {
  xp: number;
  items: ShopItem[];
  owned: Record<string, number>;
  equipped: Record<"avatar_accessory" | "shelf_theme" | "pet", string | null>;
}) {
  const [xp, setXp] = useState(initialXp);
  const [owned, setOwned] = useState(initialOwned);
  const [equipped, setEquipped] = useState(initialEquipped);
  const [activeCategory, setActiveCategory] = useState<Category>("avatar_accessory");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function buy(item: ShopItem) {
    setMessage("");
    setBusyItemId(item.id);
    const res = await fetch("/api/kids/shop-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemCode: item.code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyItemId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Couldn't buy that.");
      return;
    }
    setXp(data.newXp);
    setOwned((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
  }

  async function equip(item: ShopItem) {
    setMessage("");
    setBusyItemId(item.id);
    const res = await fetch("/api/kids/shop/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyItemId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Couldn't equip that.");
      return;
    }
    setEquipped((prev) => ({ ...prev, [item.category as "avatar_accessory" | "shelf_theme" | "pet"]: item.id }));
  }

  const visibleItems = items.filter((i) => i.category === activeCategory);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-kids-display text-2xl font-bold text-slate-900">Shop</h1>
        <span className="rounded-full bg-kids-yellow px-3 py-1.5 text-sm font-bold text-slate-900">✨ {xp} XP</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${
              activeCategory === c ? "bg-kids-purple text-white" : "bg-white text-slate-600 shadow-sm"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => {
          const ownedQty = owned[item.id] ?? 0;
          const canAfford = xp >= item.xp_cost;
          const isEquippable = EQUIPPABLE.has(item.category);
          const isEquipped = isEquippable && equipped[item.category as "avatar_accessory" | "shelf_theme" | "pet"] === item.id;
          const busy = busyItemId === item.id;

          return (
            <div key={item.id} className="rounded-2xl bg-white p-4 shadow-md">
              <div className="flex items-start justify-between">
                <span className="text-3xl" aria-hidden="true">
                  {item.icon_or_asset}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RARITY_STYLES[item.rarity]}`}>
                  {item.rarity}
                </span>
              </div>
              <p className="mt-2 font-semibold text-slate-900">{item.name}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-slate-500">{item.xp_cost} XP</span>
                {ownedQty > 0 && <span className="text-xs font-semibold text-kids-purple">Owned ×{ownedQty}</span>}
              </div>

              {isEquippable && ownedQty > 0 ? (
                <Button
                  variant={isEquipped ? "secondary" : "kids"}
                  className="mt-3 w-full"
                  disabled={isEquipped || busy}
                  onClick={() => equip(item)}
                >
                  {isEquipped ? "Equipped" : busy ? "Equipping…" : "Equip"}
                </Button>
              ) : (
                <Button
                  variant="kids"
                  className={`mt-3 w-full ${!canAfford ? "opacity-40" : ""}`}
                  disabled={!canAfford || busy}
                  onClick={() => buy(item)}
                >
                  {busy ? "Buying…" : canAfford ? "Buy" : "Not enough XP"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
