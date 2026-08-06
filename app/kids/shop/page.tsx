import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { ShopClient } from "@/components/kids/ShopClient";

export default async function ShopPage() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: items } = await supabase.from("shop_items").select("*").order("xp_cost", { ascending: true });
  const { data: owned } = await supabase.from("user_shop_items").select("item_id, quantity").eq("user_id", user.id);

  return (
    <ShopClient
      xp={profile?.xp ?? 0}
      items={items ?? []}
      owned={Object.fromEntries((owned ?? []).map((o) => [o.item_id, o.quantity]))}
      equipped={{
        avatar_accessory: profile?.equipped_avatar_accessory_id ?? null,
        shelf_theme: profile?.equipped_shelf_theme_id ?? null,
        pet: profile?.equipped_pet_id ?? null,
      }}
    />
  );
}
