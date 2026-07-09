import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrollInAvailableChallenges, syncChallengeProgress } from "@/lib/challenges";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await enrollInAvailableChallenges(supabase, user.id);
  await syncChallengeProgress(supabase, user.id);

  return NextResponse.json({ ok: true });
}
