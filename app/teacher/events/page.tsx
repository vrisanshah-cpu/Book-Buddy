import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { ClassroomEventsClient } from "@/components/teacher/ClassroomEventsClient";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

export default async function TeacherEventsPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");

  const supabase = await createClient();
  const { data: classrooms } = await supabase.from("classrooms").select("id, name").eq("teacher_id", user.id);

  return (
    <>
      <GoogleAdsense />
      <ClassroomEventsClient classrooms={classrooms ?? []} />
    </>
  );
}
