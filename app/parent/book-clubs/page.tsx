import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { ParentBookClubsClient } from "@/components/parent/ParentBookClubsClient";

export default async function ParentBookClubsPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "parent") redirect("/auth/login");
  return <ParentBookClubsClient parentId={user.id} />;
}
