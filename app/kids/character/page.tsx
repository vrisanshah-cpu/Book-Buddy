import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { CharacterClient } from "@/components/kids/CharacterClient";

export default async function CharacterPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  return <CharacterClient />;
}
