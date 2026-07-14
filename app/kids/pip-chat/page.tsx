import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { PipChatClient } from "@/components/kids/PipChatClient";

export default async function PipChatPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "kid") redirect("/auth/login");
  return <PipChatClient userId={user.id} />;
}