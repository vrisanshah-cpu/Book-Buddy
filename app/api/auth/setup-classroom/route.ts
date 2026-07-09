import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function generateJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { teacherId, name } = body;

  if (teacherId !== user.id) {
    return NextResponse.json({ error: "Invalid teacher" }, { status: 403 });
  }

  const admin = createAdminClient();
  const joinCode = generateJoinCode();

  const { data, error } = await admin.from("classrooms").insert({
    teacher_id: user.id,
    name: name ?? "My Classroom",
    join_code: joinCode,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ classroom: data });
}
