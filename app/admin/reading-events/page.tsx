import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AdminReadingEventCreator } from "@/components/admin/AdminReadingEventCreator";

export default async function AdminReadingEventsPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");

  return <AdminReadingEventCreator />;
}
