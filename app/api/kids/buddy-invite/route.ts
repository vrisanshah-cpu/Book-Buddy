import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invites } = await supabase
    .from("buddy_invites")
    .select(
      "id, from_kid_id, to_kid_id, title, description, goal_type, target, ends_at, status, from_kid:users!from_kid_id(id, display_name), to_kid:users!to_kid_id(id, display_name)"
    )
    .or(`from_kid_id.eq.${user.id},to_kid_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const { data: pairs } = await supabase
    .from("buddy_pairs")
    .select(
      "id, challenge_id, kid_a_id, kid_b_id, combined_progress, completed_at, challenge:buddy_challenges(id, title, description, goal_type, target, status, starts_at, ends_at), kid_a:users!kid_a_id(id, display_name), kid_b:users!kid_b_id(id, display_name)"
    )
    .or(`kid_a_id.eq.${user.id},kid_b_id.eq.${user.id}`);

  return NextResponse.json({ invites: invites ?? [], pairs: pairs ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toKidId, title, description, goalType, target, endsAt } = await request.json();

  if (!toKidId || !title?.trim() || !description?.trim() || !goalType || !target || !endsAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (toKidId === user.id) {
    return NextResponse.json({ error: "You can't buddy up with yourself" }, { status: 400 });
  }
  if (!["books_count", "minutes_read"].includes(goalType)) {
    return NextResponse.json({ error: "Invalid goal type" }, { status: 400 });
  }
  if (new Date(endsAt) <= new Date()) {
    return NextResponse.json({ error: "End date must be in the future" }, { status: 400 });
  }

  const { data: invite, error } = await supabase
    .from("buddy_invites")
    .insert({
      from_kid_id: user.id,
      to_kid_id: toKidId,
      title: title.trim(),
      description: description.trim(),
      goal_type: goalType,
      target: Number(target),
      ends_at: endsAt,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ invite });
}
