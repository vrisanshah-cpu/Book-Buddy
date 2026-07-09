import { getProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReadingGameClient } from "@/components/kids/ReadingGameClient";

export default async function ReadingGamePage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <ReadingGameClient userId={user.id} />;
}
