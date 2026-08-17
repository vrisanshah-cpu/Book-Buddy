import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { RewardsClient } from "@/components/kids/RewardsClient";

export default async function KidsRewardsPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  return <RewardsClient />;
}
