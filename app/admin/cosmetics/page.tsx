import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AdminCosmeticsClient } from "@/components/admin/AdminCosmeticsClient";

export default async function AdminCosmeticsPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");

  return <AdminCosmeticsClient />;
}
