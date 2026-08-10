import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { MarketplaceSubNav } from "@/components/marketplace/MarketplaceSubNav";
import { BrowseListings } from "@/components/marketplace/BrowseListings";

export default async function ParentMarketplacePage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "parent") redirect("/auth/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">BookBuy Marketplace</h1>
      <MarketplaceSubNav role="parent" />
      <BrowseListings role="parent" />
    </div>
  );
}
