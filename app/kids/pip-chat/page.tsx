import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { PipChatClient } from "@/components/kids/PipChatClient";

export default async function PipChatPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <PipChatClient userId={user.id} />;
}