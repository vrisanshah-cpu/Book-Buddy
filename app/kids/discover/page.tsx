import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { DiscoverClient } from "@/components/kids/DiscoverClient";

export default async function DiscoverPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "kid") redirect("/auth/login");
  return <DiscoverClient />;
}