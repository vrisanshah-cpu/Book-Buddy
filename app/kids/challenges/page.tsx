import { getProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChallengesClient } from "@/components/kids/ChallengesClient";

export default async function KidsChallengesPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <ChallengesClient userId={user.id} />;
}
