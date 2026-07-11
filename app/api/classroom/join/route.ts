import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

  // Admin client: bypasses RLS so we can look up the classroom
  // by join code before the student is a member of it.
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: classroom } = await admin
    .from("classrooms")
    .select("id, name, teacher_id")
    .eq("join_code", String(joinCode).toUpperCase().trim())
    .maybeSingle();

  if (!classroom) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  }

  const { error } = await admin.from("teacher_student").upsert(
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