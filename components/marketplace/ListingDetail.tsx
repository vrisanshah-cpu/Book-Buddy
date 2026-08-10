"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { CategoryBadge } from "./CategoryBadge";
import { formatPriceCents, CONDITION_LABELS, type MarketplaceCategory, type ListingCondition } from "@/lib/marketplace";

interface Listing {
  id: string;
  seller_id: string;
  category: MarketplaceCategory;
  title: string;
  description: string;
  price_cents: number;
  condition: ListingCondition | null;
  quantity_available: number | null;
  photo_urls: string[];
  status: "active" | "inactive";
}

/**
 * No payments happen through Book Buddy yet — "Buy now" is "Express
 * interest," which opens a normal conversation with the seller (the
 * existing create_conversation() RPC from 019_messaging.sql, which already
 * dedupes to an existing thread and enforces at least one parent/teacher
 * participant) so the two of them arrange payment and delivery themselves.
 */
export function ListingDetail({ listingId, role }: { listingId: string; role: "parent" | "teacher" }) {
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setViewerId(user?.id ?? null);
      const { data } = await supabase.from("marketplace_listings").select("*").eq("id", listingId).maybeSingle();
      setListing(data);
      if (data) {
        setMessage(`Hi! I'm interested in "${data.title}" (${formatPriceCents(data.price_cents)}). Is it still available?`);
      }
    })();
  }, [listingId]);

  async function expressInterest() {
    if (!listing || !viewerId) return;
    setSending(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: conversationId, error: rpcError } = await supabase.rpc("create_conversation", {
        p_participant_ids: [viewerId, listing.seller_id],
      });
      if (rpcError) throw rpcError;

      const { error: messageError } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: viewerId, body: message.trim() });
      if (messageError) throw messageError;

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  if (listing === undefined) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!listing) return <p className="text-sm text-slate-500">This listing isn&apos;t available.</p>;

  const isOwnListing = viewerId === listing.seller_id;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
          {listing.photo_urls[0] ? (
            <Image src={listing.photo_urls[0]} alt={listing.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">📦</div>
          )}
        </div>
        {listing.photo_urls.length > 1 && (
          <div className="mt-2 flex gap-2">
            {listing.photo_urls.slice(1).map((url) => (
              <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
                <Image src={url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <CategoryBadge category={listing.category} />
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{listing.title}</h1>
        <p className="mt-1 text-xl font-semibold text-slate-900">{formatPriceCents(listing.price_cents)}</p>
        {listing.condition && (
          <p className="mt-1 text-sm text-slate-500">Condition: {CONDITION_LABELS[listing.condition]}</p>
        )}
        {listing.quantity_available !== null && (
          <p className="mt-1 text-sm text-slate-500">{listing.quantity_available} available</p>
        )}
        <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{listing.description}</p>

        {isOwnListing ? (
          <Link href={`/${role}/marketplace/sell/${listing.id}`} className="mt-6 inline-block">
            <Button variant="secondary">Edit this listing</Button>
          </Link>
        ) : listing.status !== "active" ? (
          <p className="mt-6 text-sm text-slate-500">This listing is no longer active.</p>
        ) : sent ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-800">✅ Message sent</p>
            <p className="mt-1 text-sm text-emerald-700">
              The seller can reply in Messages — you two can work out payment and delivery there. Book Buddy
              doesn&apos;t process any payment for this yet.
            </p>
            <Link href={`/${role}/messages`} className="mt-3 inline-block">
              <Button variant="secondary">Go to Messages</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Interested? Message the seller</p>
            <p className="text-xs text-slate-500">
              Book Buddy doesn&apos;t handle payment or shipping for marketplace items yet — you and the seller
              coordinate those details directly once you connect.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={expressInterest} disabled={sending || !message.trim()}>
              {sending ? "Sending…" : "Express interest"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
