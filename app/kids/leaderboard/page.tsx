import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { LeaderboardClient } from "@/components/kids/LeaderboardClient";

export default async function LeaderboardPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "kid") redirect("/auth/login");
  return <LeaderboardClient userId={user.id} />;
}