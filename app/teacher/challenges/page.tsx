import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { TeacherChallengesClient } from "@/components/teacher/TeacherChallengesClient";

export default async function TeacherChallengesPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");

  const supabase = await createClient();
  const { data: classrooms } = await supabase
    .from("classrooms")
    .select("id, name")
    .eq("teacher_id", user.id);

  return (
    <TeacherChallengesClient
      teacherId={user.id}
      classrooms={classrooms ?? []}
    />
  );
}
