import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { CompetitionsClient } from "@/components/kids/CompetitionsClient";

export default async function KidsCompetitionsPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  return <CompetitionsClient currentUserId={user.id} />;
}
