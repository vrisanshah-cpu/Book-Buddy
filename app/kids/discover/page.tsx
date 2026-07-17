import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { DiscoverClient } from "@/components/kids/DiscoverClient";

export default async function DiscoverPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <DiscoverClient />;
}