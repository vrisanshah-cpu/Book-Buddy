import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateGoalSpec, syncClassroomEventStatuses } from "@/lib/classroom-events";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedClassroomId = searchParams.get("classroomId");

  const { data: taught } = await supabase.from("classrooms").select("id").eq("teacher_id", user.id);
  let classroomIds = (taught ?? []).map((c) => c.id as string);

  if (classroomIds.length === 0) {
    const { data: memberships } = await supabase
      .from("teacher_student")
      .select("classroom_id")
      .eq("student_id", user.id)
      .not("classroom_id", "is", null);
    classroomIds = (memberships ?? []).map((m) => m.classroom_id as string).filter(Boolean);
  }

  if (requestedClassroomId) {
    if (!classroomIds.includes(requestedClassroomId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    classroomIds = [requestedClassroomId];
  }

  if (classroomIds.length === 0) {
    return NextResponse.json({ events: [] });
  }

  // Sync (activate/close + rank) before reading, so the list is never
  // stale for whoever happens to open it first.
  const admin = createAdminClient();
  for (const id of classroomIds) {
    await syncClassroomEventStatuses(admin, id);
  }

  const { data: events } = await supabase
    .from("classroom_events")
    .select("*")
    .in("classroom_id", classroomIds)
    .order("starts_at", { ascending: false });

  return NextResponse.json({ events: events ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { classroomId, startsAt, endsAt, ...rest } = body;

  if (!classroomId) {
    return NextResponse.json({ error: "Missing classroomId" }, { status: 400 });
  }

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!classroom) {
    return NextResponse.json({ error: "You don't own that classroom" }, { status: 403 });
  }

  const spec = validateGoalSpec(rest);
  if (!spec) {
    return NextResponse.json({ error: "Invalid event details" }, { status: 400 });
  }

  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const { data: created, error } = await supabase
    .from("classroom_events")
    .insert({
      classroom_id: classroomId,
      created_by: user.id,
      title: spec.title,
      description: spec.description,
      goal_type: spec.goal_type,
      goal_config: spec.goal_config,
      starts_at: startsAt,
      ends_at: endsAt,
      status: new Date(startsAt) <= new Date() ? "active" : "upcoming",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: created });
}
