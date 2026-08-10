"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SLOT_TAB_ORDER, SLOT_LABELS, type CosmeticItem, type CosmeticSlot } from "@/lib/character";

export function AdminCosmeticsClient() {
  const [items, setItems] = useState<CosmeticItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [slot, setSlot] = useState<CosmeticSlot>("hair");
  const [name, setName] = useState("");
  const [rarity, setRarity] = useState<CosmeticItem["rarity"]>("common");
  const [xpCost, setXpCost] = useState("100");
  const [collection, setCollection] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/cosmetics");
    const data = await res.json().catch(() => ({}));
    setItems(res.ok ? data.items ?? [] : []);
    setLoading(false);
  }

  async function upload() {
    setError("");
    setMessage("");
    if (!file || !name.trim()) {
      setError("Pick an image and give it a name.");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("slot", slot);
    form.append("name", name.trim());
    form.append("rarity", rarity);
    form.append("xpCost", xpCost);
    form.append("collection", collection.trim());

    const res = await fetch("/api/admin/cosmetics", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't upload that.");
      return;
    }
    setMessage(`Added "${data.item.name}".`);
    setName("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await load();
  }

  const grouped = new Map<string, CosmeticItem[]>();
  for (const item of items) {
    const key = item.collection ?? (item.is_starter ? "starters" : "uncategorized");
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-admin-primary">Character Cosmetics</h1>
      <p className="mt-1 text-admin-muted">Upload this month&apos;s drop — each image should be a transparent 600×800 PNG.</p>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-admin-primary">New cosmetic</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value as CosmeticSlot)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
          >
            {SLOT_TAB_ORDER.map((s) => (
              <option key={s} value={s}>
                {SLOT_LABELS[s]}
              </option>
            ))}
          </select>
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select
            value={rarity}
            onChange={(e) => setRarity(e.target.value as CosmeticItem["rarity"])}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2"
          >
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
          <Input type="number" min={0} placeholder="XP cost" value={xpCost} onChange={(e) => setXpCost(e.target.value)} />
          <Input
            placeholder="Collection tag, e.g. 2026-09"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="sm:col-span-2"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="sm:col-span-2 text-sm"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
        <Button variant="secondary" className="mt-3" disabled={uploading} onClick={upload}>
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        {loading && <p className="text-sm text-admin-muted">Loading…</p>}
        {!loading &&
          Array.from(grouped.entries()).map(([collectionName, collectionItems]) => (
            <div key={collectionName}>
              <h2 className="font-semibold text-admin-primary">{collectionName}</h2>
              <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {collectionItems.map((item) => (
                  <div key={item.id} className="rounded-lg bg-white p-2 shadow-sm">
                    <div className="aspect-square overflow-hidden rounded bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element -- admin catalog thumbnail */}
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-admin-primary">{item.name}</p>
                    <p className="text-xs text-admin-muted">{SLOT_LABELS[item.slot]}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
