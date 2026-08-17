import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateStreak } from "@/lib/reading-stats";

const MILESTONES = [3, 7, 14, 30] as const;
const MILESTONE_XP: Record<number, number> = { 3: 30, 7: 75, 14: 150, 30: 300 };

function randomCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: sessions }, { data: profile }, { data: todaySpin }, { data: claims }, { count: referralCount }] =
    await Promise.all([
      supabase.from("reading_sessions").select("date, minutes_read").eq("user_id", user.id),
      supabase.from("users").select("referral_code").eq("id", user.id).single(),
      supabase
        .from("daily_spins")
        .select("xp_awarded")
        .eq("user_id", user.id)
        .eq("spin_date", new Date().toISOString().slice(0, 10))
        .maybeSingle(),
      supabase.from("streak_reward_claims").select("streak_milestone").eq("user_id", user.id),
      supabase.from("referral_rewards").select("id", { count: "exact", head: true }).eq("referrer_id", user.id).eq("status", "rewarded"),
    ]);

  const streak = calculateStreak(sessions ?? []);
  const claimedMilestones = new Set((claims ?? []).map((c) => c.streak_milestone));

  // Lazily generate a referral code the first time it's needed, rather
  // than at signup — keeps the signup flow untouched, and this is a
  // simple self-write already covered by users_update_own (migration
  // 001). Retries a few times on the unlikely chance of a collision.
  let referralCode = profile?.referral_code ?? null;
  if (!referralCode) {
    for (let attempt = 0; attempt < 5 && !referralCode; attempt++) {
      const candidate = randomCode();
      const { error } = await supabase.from("users").update({ referral_code: candidate }).eq("id", user.id);
      if (!error) referralCode = candidate;
    }
  }

  return NextResponse.json({
    streak,
    milestones: MILESTONES.map((m) => ({
      milestone: m,
      xp: MILESTONE_XP[m],
      reached: streak >= m,
      claimed: claimedMilestones.has(m),
    })),
    todaySpinXp: todaySpin?.xp_awarded ?? null,
    referralCode,
    successfulReferrals: referralCount ?? 0,
  });
}
