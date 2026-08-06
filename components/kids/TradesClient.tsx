"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface CatalogItem {
  id: string;
  name: string;
  icon_or_asset: string;
  rarity: string;
  category: string;
}
interface OwnedItem {
  itemId: string;
  quantity: number;
  item: CatalogItem | null;
}
interface Classmate {
  id: string;
  display_name: string;
}
interface TradeOffer {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  offered_item: CatalogItem | null;
  requested_item: CatalogItem | null;
  sender: { id: string; display_name: string } | null;
  receiver: { id: string; display_name: string } | null;
}

export function TradesClient({
  currentUserId,
  myItems,
  allItems,
  classmates,
}: {
  currentUserId: string;
  myItems: OwnedItem[];
  allItems: CatalogItem[];
  classmates: Classmate[];
}) {
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiverId, setReceiverId] = useState(classmates[0]?.id ?? "");
  const [offeredItemId, setOfferedItemId] = useState(myItems[0]?.itemId ?? "");
  const [requestedItemId, setRequestedItemId] = useState(allItems[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void loadTrades();
  }, []);

  async function loadTrades() {
    setLoading(true);
    const res = await fetch("/api/kids/trades");
    const data = await res.json().catch(() => ({}));
    setTrades(res.ok ? data.trades ?? [] : []);
    setLoading(false);
  }

  async function propose() {
    setError("");
    if (!receiverId || !offeredItemId || !requestedItemId) {
      setError("Pick a classmate, what you're offering, and what you want.");
      return;
    }
    const res = await fetch("/api/kids/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId, offeredItemId, requestedItemId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't propose that trade.");
      return;
    }
    await loadTrades();
  }

  async function respond(tradeId: string, action: "accept" | "decline" | "cancel") {
    setError("");
    setBusyId(tradeId);
    const res = await fetch(`/api/kids/trades/${tradeId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Couldn't do that.");
      return;
    }
    await loadTrades();
  }

  return (
    <div>
      <h1 className="font-kids-display text-2xl font-bold text-slate-900">Trades</h1>
      <p className="mt-1 text-slate-500">Swap cosmetics 1-for-1 with a classmate.</p>

      {classmates.length === 0 || myItems.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">
          {classmates.length === 0
            ? "You'll need a classmate linked to trade with."
            : "You don't own any shop items yet — visit the Shop first!"}
        </p>
      ) : (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-md">
          <h2 className="font-semibold text-slate-900">Propose a trade</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2"
            >
              {classmates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
            </select>
            <select
              value={offeredItemId}
              onChange={(e) => setOfferedItemId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2"
            >
              {myItems.map((o) => (
                <option key={o.itemId} value={o.itemId}>
                  You give: {o.item?.icon_or_asset} {o.item?.name} (×{o.quantity})
                </option>
              ))}
            </select>
            <select
              value={requestedItemId}
              onChange={(e) => setRequestedItemId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2"
            >
              {allItems.map((i) => (
                <option key={i.id} value={i.id}>
                  You get: {i.icon_or_asset} {i.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <Button variant="kids" className="mt-3" onClick={propose}>
            Propose trade
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && trades.length === 0 && <p className="text-sm text-slate-400">No trades yet.</p>}
        {trades.map((t) => {
          const busy = busyId === t.id;
          const isReceiver = t.receiver_id === currentUserId;
          const isSender = t.sender_id === currentUserId;
          return (
            <div key={t.id} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{t.sender?.display_name}</span> offers{" "}
                <span className="font-semibold">
                  {t.offered_item?.icon_or_asset} {t.offered_item?.name}
                </span>{" "}
                to <span className="font-semibold">{t.receiver?.display_name}</span> for{" "}
                <span className="font-semibold">
                  {t.requested_item?.icon_or_asset} {t.requested_item?.name}
                </span>
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    t.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : t.status === "accepted"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.status}
                </span>
                {t.status === "pending" && isReceiver && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => respond(t.id, "accept")}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => respond(t.id, "decline")}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Decline
                    </button>
                  </>
                )}
                {t.status === "pending" && isSender && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => respond(t.id, "cancel")}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
