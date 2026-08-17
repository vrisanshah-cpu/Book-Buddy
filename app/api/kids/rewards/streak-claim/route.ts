import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateStreak } from "@/lib/reading-stats";

const VALID_MILESTONES = [3, 7, 14, 30];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { milestone } = (await request.json()) as { milestone?: number };
  if (!milestone || !VALID_MILESTONES.includes(milestone)) {
    return NextResponse.json({ error: "Invalid milestone" }, { status: 400 });
  }

  // Recomputed here (not trusted from the client) so the RPC's own check
  // is validating a real, server-derived number, not something a kid's
  // browser could just claim.
  const { data: sessions } = await supabase.from("reading_sessions").select("date, minutes_read").eq("user_id", user.id);
  const currentStreak = calculateStreak(sessions ?? []);

  const { data: xpAwarded, error } = await supabase.rpc("claim_streak_reward", {
    p_user_id: user.id,
    p_milestone: milestone,
    p_current_streak: currentStreak,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (xpAwarded === null) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  return NextResponse.json({ xpAwarded });
}
