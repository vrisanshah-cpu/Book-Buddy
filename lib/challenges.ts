import type { SupabaseClient } from "@supabase/supabase-js";
import { XP_REWARDS } from "./xp";
import { calculateStreak } from "./reading-stats";
import { createAdminClient } from "./supabase/admin";

/**
 * Grants a title + badge named after a completed challenge. `titles` and
 * `user_titles` (and `badges`/`user_badges`) only have SELECT policies for
 * a normal user session — inserts are service-role only by design (see
 * migration 012) — so this always goes through the admin client, never the
 * caller's own `supabase` session.
 */
async function grantChallengeReward(
  userId: string,
  challengeId: string,
  challengeTitle: string,
  badgeIcon: string | null
) {
  const admin = createAdminClient();

  const titleCode = `challenge_${challengeId}`;
  const { data: existingTitle } = await admin
    .from("titles")
    .select("id")
    .eq("code", titleCode)
    .maybeSingle();

  const titleId =
    existingTitle?.id ??
    (
      await admin
        .from("titles")
        .insert({ code: titleCode, name: challengeTitle, rarity: "common" })
        .select("id")
        .single()
    ).data?.id;

  if (titleId) {
    const { data: alreadyHasTitle } = await admin
      .from("user_titles")
      .select("id")
      .eq("user_id", userId)
      .eq("title_id", titleId)
      .maybeSingle();
    if (!alreadyHasTitle) {
      await admin.from("user_titles").insert({
        user_id: userId,
        title_id: titleId,
        source_challenge_id: challengeId,
      });
    }
  }

  const badgeCode = `challenge_badge_${challengeId}`;
  const { data: existingBadge } = await admin
    .from("badges")
    .select("id")
    .eq("code", badgeCode)
    .maybeSingle();

  const badgeId =
    existingBadge?.id ??
    (
      await admin
        .from("badges")
        .insert({ code: badgeCode, name: challengeTitle, icon: badgeIcon ?? "🏆", rarity: "common" })
        .select("id")
        .single()
    ).data?.id;

  if (badgeId) {
    const { data: alreadyHasBadge } = await admin
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_id", badgeId)
      .maybeSingle();
    if (!alreadyHasBadge) {
      await admin.from("user_badges").insert({ user_id: userId, badge_id: badgeId });
    }
  }
}

export async function awardXp(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<number> {
  const { data } = await supabase
    .from("users")
    .select("xp")
    .eq("id", userId)
    .single();
  const newXp = (data?.xp ?? 0) + amount;
  await supabase.from("users").update({ xp: newXp }).eq("id", userId);
  return newXp;
}

export async function syncChallengeProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const completedTitles: string[] = [];

  const { data: userChallenges } = await supabase
    .from("user_challenges")
    .select("*, challenge:challenges(*)")
    .eq("user_id", userId)
    .eq("completed", false);

  if (!userChallenges?.length) return completedTitles;

  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("date, minutes_read")
    .eq("user_id", userId);

  const { data: finishedBooks } = await supabase
    .from("user_books")
    .select("finished_at")
    .eq("user_id", userId)
    .eq("status", "finished");

  const { data: gameScores } = await supabase
    .from("reading_game_scores")
    .select("score")
    .eq("user_id", userId);

  const streak = calculateStreak(sessions ?? []);
  const totalMinutes = (sessions ?? []).reduce(
    (a, s) => a + (s.minutes_read ?? 0),
    0
  );
  const booksFinished = finishedBooks?.length ?? 0;
  const bestQuiz = Math.max(0, ...(gameScores?.map((g) => g.score) ?? [0]));

  for (const uc of userChallenges) {
    const challengeData = Array.isArray(uc.challenge) ? uc.challenge[0] : uc.challenge;
    const ch = (challengeData ?? null) as {
      id: string;
      title: string;
      type: string;
      target_value: number;
      start_date: string | null;
      end_date: string | null;
      badge_icon: string | null;
    } | null;
    if (!ch) continue;

    let progress = 0;
    switch (ch.type) {
      case "reading_streak":
        progress = streak;
        break;
      case "books_finished":
        progress = booksFinished;
        break;
      case "minutes_read":
        progress = totalMinutes;
        break;
      case "quiz_score":
        progress = bestQuiz;
        break;
      default:
        progress = uc.progress ?? 0;
    }

    const done = progress >= ch.target_value;
    await supabase
      .from("user_challenges")
      .update({
        progress,
        completed: done,
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq("id", uc.id);

    if (done && !uc.completed) {
      await awardXp(supabase, userId, XP_REWARDS.complete_challenge);
      await grantChallengeReward(userId, ch.id, ch.title, ch.badge_icon);
      completedTitles.push(ch.title);
    }
  }

  return completedTitles;
}

export async function enrollInAvailableChallenges(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: existing } = await supabase
    .from("user_challenges")
    .select("challenge_id")
    .eq("user_id", userId);

  const existingIds = new Set((existing ?? []).map((e) => e.challenge_id));

  const { data: challenges } = await supabase
    .from("challenges")
    .select("id")
    .is("classroom_id", null)
    .is("personalized_for", null);

  const toEnroll = (challenges ?? []).filter((c) => !existingIds.has(c.id));

  if (toEnroll.length > 0) {
    await supabase.from("user_challenges").insert(
      toEnroll.map((c) => ({
        user_id: userId,
        challenge_id: c.id,
        progress: 0,
        completed: false,
      }))
    );
  }
}

type BuddyGoalType = "books_count" | "minutes_read";

async function scoreKidForBuddyGoal(
  admin: SupabaseClient,
  kidId: string,
  goalType: BuddyGoalType,
  startsAt: string,
  endsAt: string
): Promise<number> {
  if (goalType === "books_count") {
    const { count } = await admin
      .from("user_books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", kidId)
      .eq("status", "finished")
      .gte("finished_at", startsAt)
      .lte("finished_at", endsAt);
    return count ?? 0;
  }

  const { data } = await admin
    .from("reading_sessions")
    .select("minutes_read")
    .eq("user_id", kidId)
    .gte("date", startsAt.slice(0, 10))
    .lte("date", endsAt.slice(0, 10));
  return (data ?? []).reduce((sum, r) => sum + (r.minutes_read ?? 0), 0);
}

/**
 * Called after a kid logs a reading session (app/api/reading/log) — for
 * every active buddy pair they're in, re-scores BOTH kids (always via the
 * admin client: a kid's own session can never read a buddy's private
 * reading data, by design) and awards a shared XP bonus to both the
 * moment combined_progress reaches the target.
 */
export async function syncBuddyProgressForKid(kidId: string): Promise<void> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: pairs } = await admin
    .from("buddy_pairs")
    .select(
      "id, challenge_id, kid_a_id, kid_b_id, completed_at, challenge:buddy_challenges(id, goal_type, target, status, starts_at, ends_at)"
    )
    .or(`kid_a_id.eq.${kidId},kid_b_id.eq.${kidId}`);

  for (const pair of pairs ?? []) {
    const challenge = Array.isArray(pair.challenge) ? pair.challenge[0] : pair.challenge;
    if (!challenge || challenge.status !== "active" || pair.completed_at) continue;

    if (challenge.ends_at <= nowIso) {
      await admin.from("buddy_challenges").update({ status: "expired" }).eq("id", challenge.id);
      continue;
    }

    const [scoreA, scoreB] = await Promise.all([
      scoreKidForBuddyGoal(admin, pair.kid_a_id, challenge.goal_type, challenge.starts_at, challenge.ends_at),
      scoreKidForBuddyGoal(admin, pair.kid_b_id, challenge.goal_type, challenge.starts_at, challenge.ends_at),
    ]);
    const combined = scoreA + scoreB;
    const justCompleted = combined >= challenge.target;

    await admin
      .from("buddy_pairs")
      .update({ combined_progress: combined, completed_at: justCompleted ? nowIso : null })
      .eq("id", pair.id);

    if (justCompleted) {
      await admin.from("buddy_challenges").update({ status: "completed" }).eq("id", challenge.id);
      await awardXp(admin, pair.kid_a_id, XP_REWARDS.buddy_challenge_complete);
      await awardXp(admin, pair.kid_b_id, XP_REWARDS.buddy_challenge_complete);
    }
  }
}