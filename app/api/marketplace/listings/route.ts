import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMarketplaceCategory } from "@/lib/marketplace";

const MAX_PHOTOS = 6;

/**
 * Creates a listing for the calling seller. Uses the request-scoped client,
 * not admin — the marketplace_listings_insert_own RLS policy
 * (029_marketplace_schema.sql) already restricts this to parent/teacher
 * accounts listing under their own seller_id; this route just adds
 * friendlier validation than a raw Postgres error.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "parent" && profile.role !== "teacher")) {
    return NextResponse.json({ error: "Only parent or teacher accounts can sell." }, { status: 403 });
  }

  const body = await request.json();
  const { category, title, description, priceDollars, condition, quantityAvailable, photoUrls } = body ?? {};

  if (!isMarketplaceCategory(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0 || title.length > 140) {
    return NextResponse.json({ error: "Title is required (up to 140 characters)." }, { status: 400 });
  }
  if (typeof description !== "string" || description.trim().length === 0 || description.length > 4000) {
    return NextResponse.json({ error: "Description is required (up to 4000 characters)." }, { status: 400 });
  }
  const priceCents = Math.round(Number(priceDollars) * 100);
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return NextResponse.json({ error: "Price must be greater than $0." }, { status: 400 });
  }
  if (condition !== undefined && condition !== null && !["new", "used", "digital", "service"].includes(condition)) {
    return NextResponse.json({ error: "Invalid condition." }, { status: 400 });
  }
  if (
    quantityAvailable !== undefined &&
    quantityAvailable !== null &&
    (!Number.isInteger(quantityAvailable) || quantityAvailable < 0)
  ) {
    return NextResponse.json(
      { error: "Quantity must be a non-negative whole number, or left blank for unlimited." },
      { status: 400 }
    );
  }
  const photos = Array.isArray(photoUrls) ? photoUrls.filter((u) => typeof u === "string").slice(0, MAX_PHOTOS) : [];

  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .insert({
      seller_id: user.id,
      category,
      title: title.trim(),
      description: description.trim(),
      price_cents: priceCents,
      condition: condition ?? null,
      quantity_available: quantityAvailable ?? null,
      photo_urls: photos,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listing });
}
