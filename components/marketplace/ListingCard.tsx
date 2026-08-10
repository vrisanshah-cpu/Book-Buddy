import Link from "next/link";
import Image from "next/image";
import { CategoryBadge } from "./CategoryBadge";
import { formatPriceCents, type MarketplaceCategory } from "@/lib/marketplace";

interface ListingCardListing {
  id: string;
  title: string;
  category: MarketplaceCategory;
  price_cents: number;
  photo_urls: string[];
}

export function ListingCard({
  listing,
  role,
  why,
}: {
  listing: ListingCardListing;
  role: "parent" | "teacher";
  why?: string;
}) {
  return (
    <Link
      href={`/${role}/marketplace/listing/${listing.id}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        {listing.photo_urls[0] ? (
          <Image src={listing.photo_urls[0]} alt={listing.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">📦</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <CategoryBadge category={listing.category} />
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{listing.title}</p>
        <p className="mt-auto text-base font-bold text-slate-900">{formatPriceCents(listing.price_cents)}</p>
        {why && <p className="text-xs italic text-slate-500">{why}</p>}
      </div>
    </Link>
  );
}
