import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Streak-as-of-a-given-anchor-day, walking backward with no "today is
 * lenient" special case (unlike calculateStreak in lib/reading-stats.ts,
 * which always anchors on the real today). Used here only to answer "was
 * there a streak alive as of two days ago, before yesterday's gap?" —
 * calculateStreak can't answer that because it's hardcoded to anchor on
 * today, and by the time yesterday is missing, it already reports 0.
 */
function streakAsOf(dates: Set<string>, anchor: Date): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (dates.has(key)) streak++;
    else break;
  }
  return streak;
}

/**
 * Called once per kids-layout load ("upon next login" per the product
 * spec). Cheap early-exit for the common case (yesterday's already
 * logged, or there was no streak to protect), so it doesn't add real
 * cost to normal page loads — and it's idempotent: once the placeholder
 * session is inserted, the next call sees yesterday as covered and exits
 * immediately, so a freeze is never spent twice for the same gap.
 *
 * Runs with the kid's own RLS-scoped client — reading_sessions_own
 * (migration 001) already lets a kid insert their own sessions, and
 * consume_shop_item (migration 020) is a SECURITY DEFINER function that
 * checks auth.uid() itself, so no admin client is needed here.
 */
export async function checkAndApplyStreakFreeze(
  supabase: SupabaseClient,
  userId: string
): Promise<{ applied: boolean }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(today.getDate() - 2);
  const windowStart = new Date(today);
  windowStart.setDate(today.getDate() - 30);

  const yesterdayKey = yesterday.toISOString().split("T")[0];

  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("date")
    .eq("user_id", userId)
    .gte("date", windowStart.toISOString().split("T")[0]);

  const dates = new Set((sessions ?? []).map((s) => s.date.split("T")[0]));

  if (dates.has(yesterdayKey)) {
    return { applied: false }; // no gap — nothing to do
  }

  const priorStreak = streakAsOf(dates, dayBeforeYesterday);
  if (priorStreak === 0) {
    return { applied: false }; // no streak was at risk
  }

  const { data: freezeConsumed } = await supabase.rpc("consume_shop_item", { p_item_code: "streak_freeze" });
  if (!freezeConsumed) {
    return { applied: false }; // no freeze available to spend
  }

  const { data: recentSession } = await supabase
    .from("reading_sessions")
    .select("book_id")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!recentSession?.book_id) {
    // Shouldn't happen if priorStreak > 0 (that requires a prior logged
    // session), but bail safely rather than insert an invalid row.
    return { applied: false };
  }

  await supabase.from("reading_sessions").insert({
    user_id: userId,
    book_id: recentSession.book_id,
    minutes_read: 0,
    pages_read: 0,
    date: yesterdayKey,
  });

  await supabase.from("streak_freeze_events").insert({ user_id: userId, frozen_date: yesterdayKey });

  return { applied: true };
}
