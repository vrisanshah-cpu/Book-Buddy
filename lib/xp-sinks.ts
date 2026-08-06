import type { SupabaseClient } from "@supabase/supabase-js";

export type PurchaseResult = { ok: true; newXp: number } | { ok: false; error: string };

/**
 * Buys one unit of a shop item for a kid: spend_xp() and grant_shop_item()
 * (migration 020) are both SECURITY DEFINER functions doing their own
 * auth.uid() check and row-level locking, so this is safe to call with
 * the kid's own RLS-scoped client — no admin client needed, and two
 * concurrent purchases can't double-spend the same XP.
 */
export async function purchaseShopItem(
  supabase: SupabaseClient,
  userId: string,
  itemCode: string
): Promise<PurchaseResult> {
  const { data: item } = await supabase.from("shop_items").select("id, name, xp_cost").eq("code", itemCode).maybeSingle();
  if (!item) return { ok: false, error: "That item doesn't exist" };

  const { data: spent, error: spendError } = await supabase.rpc("spend_xp", {
    p_user_id: userId,
    p_amount: item.xp_cost,
    p_reason: item.name,
  });
  if (spendError) return { ok: false, error: spendError.message };
  if (!spent) return { ok: false, error: "Not enough XP for that" };

  const { error: grantError } = await supabase.rpc("grant_shop_item", { p_user_id: userId, p_item_id: item.id });
  if (grantError) return { ok: false, error: grantError.message };

  const { data: user } = await supabase.from("users").select("xp").eq("id", userId).single();
  return { ok: true, newXp: user?.xp ?? 0 };
}
