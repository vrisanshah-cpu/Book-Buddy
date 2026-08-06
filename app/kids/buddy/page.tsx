import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { BuddyClient } from "@/components/kids/BuddyClient";

export default async function BuddyPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: myClassrooms } = await supabase
    .from("teacher_student")
    .select("classroom_id")
    .eq("student_id", user.id)
    .not("classroom_id", "is", null);
  const classroomIds = (myClassrooms ?? []).map((c) => c.classroom_id).filter(Boolean);

  let classmates: { id: string; display_name: string }[] = [];
  if (classroomIds.length > 0) {
    const { data: rows } = await supabase
      .from("teacher_student")
      .select("student:users!student_id(id, display_name)")
      .in("classroom_id", classroomIds)
      .neq("student_id", user.id);
    const seen = new Map<string, { id: string; display_name: string }>();
    for (const r of rows ?? []) {
      const s = Array.isArray(r.student) ? r.student[0] : r.student;
      if (s) seen.set(s.id, s);
    }
    classmates = Array.from(seen.values());
  }

  return <BuddyClient currentUserId={user.id} classmates={classmates} />;
}
