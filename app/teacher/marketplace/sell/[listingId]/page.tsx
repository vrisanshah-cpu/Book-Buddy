import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { MarketplaceSubNav } from "@/components/marketplace/MarketplaceSubNav";
import { ListingForm } from "@/components/marketplace/ListingForm";

export default async function TeacherEditListingPage({ params }: { params: { listingId: string } }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Edit listing</h1>
      <MarketplaceSubNav role="teacher" />
      <ListingForm role="teacher" listingId={params.listingId} />
    </div>
  );
}
