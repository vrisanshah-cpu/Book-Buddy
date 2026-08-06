import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AdminCompetitionsClient } from "@/components/admin/AdminCompetitionsClient";

export default async function AdminCompetitionsPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");

  return <AdminCompetitionsClient />;
}
