import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { InstitutionCatalogClient } from "@/components/admin/InstitutionCatalogClient";

export default async function InstitutionCatalogPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");

  return <InstitutionCatalogClient />;
}
