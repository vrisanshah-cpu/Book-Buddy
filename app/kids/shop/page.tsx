import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { ShopClient } from "@/components/kids/ShopClient";

export default async function ShopPage() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  // avatar_accessory/shelf_theme/pet were retired in favor of the
  // Character System (migration 029) — only the two utility categories
  // are still sellable here.
  const { data: items } = await supabase
    .from("shop_items")
    .select("*")
    .in("category", ["xp_booster", "streak_freeze"])
    .order("xp_cost", { ascending: true });
  const { data: owned } = await supabase.from("user_shop_items").select("item_id, quantity").eq("user_id", user.id);

  return (
    <ShopClient
      xp={profile?.xp ?? 0}
      items={items ?? []}
      owned={Object.fromEntries((owned ?? []).map((o) => [o.item_id, o.quantity]))}
    />
  );
}
