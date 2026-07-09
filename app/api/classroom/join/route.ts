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

  const { joinCode } = await request.json();
  if (!joinCode) {
    return NextResponse.json({ error: "Join code required" }, { status: 400 });
  }

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, teacher_id")
    .eq("join_code", String(joinCode).toUpperCase().trim())
    .maybeSingle();

  if (!classroom) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  }

  const { error } = await supabase.from("teacher_student").upsert(
    {
      teacher_id: classroom.teacher_id,
      student_id: user.id,
      classroom_id: classroom.id,
      classroom_name: classroom.name,
    },
    { onConflict: "teacher_id,student_id,classroom_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ classroom });
}
