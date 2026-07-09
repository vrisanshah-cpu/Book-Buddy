import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { TeacherBookClubsClient } from "@/components/teacher/TeacherBookClubsClient";

export default async function TeacherBookClubsPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");
  return <TeacherBookClubsClient teacherId={user.id} />;
}
