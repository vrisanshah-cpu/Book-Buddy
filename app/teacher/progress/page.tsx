import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { TeacherProgressClient } from "@/components/teacher/TeacherProgressClient";

export default async function TeacherProgressPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");
  return <TeacherProgressClient teacherId={user.id} />;
}
