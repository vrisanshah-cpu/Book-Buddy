import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { LeaderboardClient } from "@/components/kids/LeaderboardClient";

export default async function LeaderboardPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <LeaderboardClient userId={user.id} />;
}