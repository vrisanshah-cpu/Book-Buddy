import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { TeacherBookListsClient } from "@/components/teacher/TeacherBookListsClient";
import { FeaturedBooksManager } from "@/components/teacher/FeaturedBooksManager";

export default async function TeacherBookListsPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");

  const supabase = await createClient();
  const { data: classrooms } = await supabase.from("classrooms").select("id, name").eq("teacher_id", user.id);

  return (
    <>
      <TeacherBookListsClient teacherId={user.id} classrooms={classrooms ?? []} />
      <FeaturedBooksManager classrooms={classrooms ?? []} />
    </>
  );
}