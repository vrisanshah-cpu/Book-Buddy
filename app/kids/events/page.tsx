import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { EventsClient } from "@/components/kids/EventsClient";

export default async function KidsEventsPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <EventsClient userId={user.id} />;
}