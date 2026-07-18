import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AdminFeaturedManager } from "@/components/admin/AdminFeaturedManager";

export default async function AdminFeaturedBooksPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");

  return <AdminFeaturedManager />;
}