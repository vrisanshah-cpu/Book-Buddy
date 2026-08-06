import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { TeacherSettingsClient } from "@/components/teacher/TeacherSettingsClient";

export default async function TeacherSettingsPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");

  const supabase = await createClient();
  const { data: classrooms } = await supabase
    .from("classrooms")
    .select("id, name")
    .eq("teacher_id", user.id);

  return <TeacherSettingsClient teacherId={user.id} classrooms={classrooms ?? []} />;
}
