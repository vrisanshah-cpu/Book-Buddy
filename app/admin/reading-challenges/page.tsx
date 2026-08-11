import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AdminReadingChallengeCreator } from "@/components/admin/AdminReadingChallengeCreator";

export default async function AdminReadingChallengesPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");

  return <AdminReadingChallengeCreator />;
}
