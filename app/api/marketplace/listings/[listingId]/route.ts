import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMarketplaceCategory } from "@/lib/marketplace";

const MAX_PHOTOS = 6;

/**
 * Edits or (de)activates one of the caller's own listings. RLS
 * (marketplace_listings_update_own) already restricts this to the seller's
 * own rows — this route just validates the shape of the update.
 */
export async function PATCH(request: Request, { params }: { params: { listingId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.category !== undefined) {
    if (!isMarketplaceCategory(body.category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    update.category = body.category;
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > 140) {
      return NextResponse.json({ error: "Title is required (up to 140 characters)." }, { status: 400 });
    }
    update.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length === 0 || body.description.length > 4000) {
      return NextResponse.json({ error: "Description is required (up to 4000 characters)." }, { status: 400 });
    }
    update.description = body.description.trim();
  }
  if (body.priceDollars !== undefined) {
    const priceCents = Math.round(Number(body.priceDollars) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return NextResponse.json({ error: "Price must be greater than $0." }, { status: 400 });
    }
    update.price_cents = priceCents;
  }
  if (body.condition !== undefined) {
    if (body.condition !== null && !["new", "used", "digital", "service"].includes(body.condition)) {
      return NextResponse.json({ error: "Invalid condition." }, { status: 400 });
    }
    update.condition = body.condition;
  }
  if (body.quantityAvailable !== undefined) {
    if (body.quantityAvailable !== null && (!Number.isInteger(body.quantityAvailable) || body.quantityAvailable < 0)) {
      return NextResponse.json(
        { error: "Quantity must be a non-negative whole number, or null for unlimited." },
        { status: 400 }
      );
    }
    update.quantity_available = body.quantityAvailable;
  }
  if (body.photoUrls !== undefined) {
    if (!Array.isArray(body.photoUrls)) {
      return NextResponse.json({ error: "photoUrls must be an array." }, { status: 400 });
    }
    update.photo_urls = body.photoUrls.filter((u: unknown) => typeof u === "string").slice(0, MAX_PHOTOS);
  }
  if (body.status !== undefined) {
    if (!["active", "inactive"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status;
  }

  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .update(update)
    .eq("id", params.listingId)
    .eq("seller_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json({ listing });
}
