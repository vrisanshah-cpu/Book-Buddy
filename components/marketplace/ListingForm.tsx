"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  MARKETPLACE_CATEGORIES,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  type MarketplaceCategory,
  type ListingCondition,
} from "@/lib/marketplace";

const MAX_PHOTOS = 6;

interface ListingFormValues {
  category: MarketplaceCategory;
  title: string;
  description: string;
  priceDollars: string;
  condition: ListingCondition | "";
  unlimited: boolean;
  quantityAvailable: string;
  photoUrls: string[];
}

const EMPTY: ListingFormValues = {
  category: "books",
  title: "",
  description: "",
  priceDollars: "",
  condition: "",
  unlimited: true,
  quantityAvailable: "",
  photoUrls: [],
};

/** Create mode when listingId is omitted; edit mode fetches the existing
 * row itself (same "component owns its own data" convention as
 * MessagesInbox) so the app/parent and app/teacher edit pages can stay thin. */
export function ListingForm({ role, listingId }: { role: "parent" | "teacher"; listingId?: string }) {
  const router = useRouter();
  const [values, setValues] = useState<ListingFormValues>(EMPTY);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!listingId) return;
    const supabase = createClient();
    supabase
      .from("marketplace_listings")
      .select("category, title, description, price_cents, condition, quantity_available, photo_urls")
      .eq("id", listingId)
      .single()
      .then(({ data }) => {
        if (data) {
          setValues({
            category: data.category,
            title: data.title,
            description: data.description,
            priceDollars: (data.price_cents / 100).toString(),
            condition: data.condition ?? "",
            unlimited: data.quantity_available === null,
            quantityAvailable: data.quantity_available !== null ? String(data.quantity_available) : "",
            photoUrls: data.photo_urls ?? [],
          });
        }
        setLoading(false);
      });
  }, [listingId]);

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - values.photoUrls.length)) {
        const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("marketplace-listing-photos").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("marketplace-listing-photos").getPublicUrl(path);
        uploaded.push(publicUrl.publicUrl);
      }
      setValues((v) => ({ ...v, photoUrls: [...v.photoUrls, ...uploaded].slice(0, MAX_PHOTOS) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setValues((v) => ({ ...v, photoUrls: v.photoUrls.filter((u) => u !== url) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      category: values.category,
      title: values.title,
      description: values.description,
      priceDollars: Number(values.priceDollars),
      condition: values.condition || null,
      quantityAvailable: values.unlimited ? null : Number(values.quantityAvailable),
      photoUrls: values.photoUrls,
    };

    try {
      const res = await fetch(listingId ? `/api/marketplace/listings/${listingId}` : "/api/marketplace/listings", {
        method: listingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save listing.");
      router.push(`/${role}/marketplace/sell`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading listing…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
        <select
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as MarketplaceCategory }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900"
        >
          {MARKETPLACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Title"
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        maxLength={140}
        required
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          maxLength={4000}
          rows={5}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      <Input
        label="Asking price (USD)"
        type="number"
        min="0.01"
        step="0.01"
        value={values.priceDollars}
        onChange={(e) => setValues((v) => ({ ...v, priceDollars: e.target.value }))}
        required
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Condition (optional)</label>
        <select
          value={values.condition}
          onChange={(e) => setValues((v) => ({ ...v, condition: e.target.value as ListingCondition | "" }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900"
        >
          <option value="">Not specified</option>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.unlimited}
            onChange={(e) => setValues((v) => ({ ...v, unlimited: e.target.checked }))}
          />
          Unlimited / appointment-based (tutoring, coaching, editing, etc.)
        </label>
        {!values.unlimited && (
          <Input
            label="Quantity available"
            type="number"
            min="0"
            step="1"
            value={values.quantityAvailable}
            onChange={(e) => setValues((v) => ({ ...v, quantityAvailable: e.target.value }))}
            className="mt-2"
            required
          />
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Photos (up to {MAX_PHOTOS})</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handlePhotoUpload(e.target.files)}
          disabled={uploading || values.photoUrls.length >= MAX_PHOTOS}
        />
        {values.photoUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {values.photoUrls.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                {/* Small fixed-size upload preview — next/image isn't worth the setup here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute right-0 top-0 rounded-bl bg-black/60 px-1 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={saving || uploading}>
        {saving ? "Saving…" : listingId ? "Save changes" : "Create listing"}
      </Button>
    </form>
  );
}
