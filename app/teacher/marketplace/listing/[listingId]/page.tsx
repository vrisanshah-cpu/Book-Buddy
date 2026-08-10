import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { ListingDetail } from "@/components/marketplace/ListingDetail";

export default async function TeacherListingDetailPage({ params }: { params: { listingId: string } }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");

  return <ListingDetail listingId={params.listingId} role="teacher" />;
}
