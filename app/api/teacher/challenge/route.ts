import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    type,
    targetValue,
    badgeIcon,
    startDate,
    endDate,
    classroomId,
    studentIds,
  } = body;

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      title,
      description,
      type,
      target_value: targetValue,
      badge_icon: badgeIcon ?? "🏆",
      start_date: startDate,
      end_date: endDate,
      created_by: user.id,
      classroom_id: classroomId ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let ids: string[] = studentIds ?? [];
  if (!ids.length && classroomId) {
    const { data: students } = await supabase
      .from("teacher_student")
      .select("student_id")
      .eq("classroom_id", classroomId)
      .eq("teacher_id", user.id);
    ids = students?.map((s) => s.student_id) ?? [];
  }

  if (ids.length) {
    await supabase.from("user_challenges").insert(
      ids.map((sid) => ({
        user_id: sid,
        challenge_id: challenge.id,
        progress: 0,
        completed: false,
      }))
    );
  }

  return NextResponse.json({ challenge });
}
