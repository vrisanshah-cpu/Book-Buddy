import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { MarketplaceSubNav } from "@/components/marketplace/MarketplaceSubNav";
import { MyListingsPanel } from "@/components/marketplace/MyListingsPanel";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function ParentMarketplaceSellPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "parent") redirect("/auth/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">BookBuy Marketplace</h1>
      <MarketplaceSubNav role="parent" />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your listings</h2>
          <Link href="/parent/marketplace/sell/new">
            <Button>+ New listing</Button>
          </Link>
        </div>
        <MyListingsPanel role="parent" />
      </div>
    </div>
  );
}
