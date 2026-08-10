import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { ListingDetail } from "@/components/marketplace/ListingDetail";

export default async function ParentListingDetailPage({ params }: { params: { listingId: string } }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "parent") redirect("/auth/login");

  return <ListingDetail listingId={params.listingId} role="parent" />;
}
