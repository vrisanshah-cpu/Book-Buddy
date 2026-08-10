import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CosmeticSlot } from "@/lib/character";

const VALID_SLOTS = new Set<CosmeticSlot>(["background", "body", "hair", "outfit", "accessory", "pet"]);

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };

  return { error: null };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data: items } = await admin
    .from("cosmetic_items")
    .select("*")
    .order("collection", { ascending: false })
    .order("slot");

  return NextResponse.json({ items: items ?? [] });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const form = await request.formData();
  const file = form.get("file");
  const slot = form.get("slot") as string | null;
  const name = form.get("name") as string | null;
  const rarity = (form.get("rarity") as string | null) ?? "common";
  const xpCost = Number(form.get("xpCost") ?? 0);
  const collection = (form.get("collection") as string | null)?.trim() || null;

  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!slot || !VALID_SLOTS.has(slot as CosmeticSlot)) return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  if (!["common", "rare", "epic", "legendary"].includes(rarity)) {
    return NextResponse.json({ error: "Invalid rarity" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });

  const admin = createAdminClient();

  const ext = file.name.split(".").pop() || "png";
  const path = `${collection ?? "uncategorized"}/${slot}-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage.from("cosmetics").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const {
    data: { publicUrl },
  } = admin.storage.from("cosmetics").getPublicUrl(path);

  const { data: item, error: insertError } = await admin
    .from("cosmetic_items")
    .insert({
      slot,
      name: name.trim(),
      image_url: publicUrl,
      rarity,
      xp_cost: Number.isFinite(xpCost) ? Math.max(0, Math.round(xpCost)) : 0,
      collection,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ item });
}
