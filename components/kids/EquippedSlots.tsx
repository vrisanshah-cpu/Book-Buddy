"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OwnedBadge {
  id: string;
  name: string;
  icon: string;
}
interface OwnedTitle {
  id: string;
  name: string;
}

export function EquippedSlots({
  avatarUrl,
  ownedBadges,
  ownedTitles,
  equippedBadge,
  equippedTitle,
}: {
  avatarUrl: string | null;
  ownedBadges: OwnedBadge[];
  ownedTitles: OwnedTitle[];
  equippedBadge: OwnedBadge | null;
  equippedTitle: OwnedTitle | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"badge" | "title" | null>(null);
  const [busy, setBusy] = useState(false);

  async function equip(type: "badge" | "title", itemId: string | null) {
    setBusy(true);
    await fetch("/api/kids/equip-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, itemId }),
    });
    setBusy(false);
    setOpen(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/20 text-3xl">
          {avatarUrl ?? "📖"}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setOpen("title")}
            className="min-h-[28px] rounded-full bg-white/20 px-3 text-left text-sm font-semibold hover:bg-white/30"
          >
            {equippedTitle ? equippedTitle.name : "+ Equip a title"}
          </button>
          <button
            type="button"
            onClick={() => setOpen("badge")}
            className="flex min-h-[28px] items-center gap-1 rounded-full bg-white/20 px-3 text-left text-sm font-semibold hover:bg-white/30"
          >
            {equippedBadge ? (
              <>
                <span aria-hidden="true">{equippedBadge.icon}</span> {equippedBadge.name}
              </>
            ) : (
              "+ Equip a badge"
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(null)}>
          <div
            className="max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 text-slate-900 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-kids-display text-lg font-bold">
              {open === "badge" ? "Choose a badge" : "Choose a title"}
            </h2>
            <div className="mt-3 space-y-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => equip(open, null)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50"
              >
                None
              </button>
              {open === "badge"
                ? ownedBadges.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={busy}
                      onClick={() => equip("badge", b.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span aria-hidden="true">{b.icon}</span> {b.name}
                    </button>
                  ))
                : ownedTitles.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={busy}
                      onClick={() => equip("title", t.id)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      {t.name}
                    </button>
                  ))}
              {open === "badge" && ownedBadges.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-400">No badges earned yet.</p>
              )}
              {open === "title" && ownedTitles.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-400">No titles earned yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
