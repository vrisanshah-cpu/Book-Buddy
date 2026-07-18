import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardXp, syncChallengeProgress } from "@/lib/challenges";
import { XP_REWARDS } from "@/lib/xp";
import { calculateStreak } from "@/lib/reading-stats";
import { syncActiveEventProgress } from "@/lib/weekend-events";
import { awardAuthorCardForFinishedBook } from "@/lib/author-cards";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    bookId,
    userBookId,
    minutesRead,
    pagesRead,
    progressPercent,
    markFinished,
  } = body;

  if (!bookId || minutesRead == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await supabase.from("reading_sessions").insert({
    user_id: user.id,
    book_id: bookId,
    minutes_read: Number(minutesRead) || 0,
    pages_read: Number(pagesRead) || 0,
    date: new Date().toISOString().split("T")[0],
  });

  const updates: Record<string, unknown> = {};
  if (progressPercent != null) {
    updates.progress_percent = Math.min(100, Math.max(0, Number(progressPercent)));
  }
  if (markFinished) {
    updates.status = "finished";
    updates.progress_percent = 100;
    updates.finished_at = new Date().toISOString();
  }
  if (userBookId && Object.keys(updates).length > 0) {
    await supabase.from("user_books").update(updates).eq("id", userBookId);
  }

  let xpGained = XP_REWARDS.reading_session;
  await awardXp(supabase, user.id, xpGained);

  let finishedBook = false;
  if (markFinished || updates.status === "finished") {
    finishedBook = true;
    xpGained += XP_REWARDS.finish_book;
    await awardXp(supabase, user.id, XP_REWARDS.finish_book);
  }

  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("date, minutes_read")
    .eq("user_id", user.id);

  const streak = calculateStreak(sessions ?? []);
  const completedChallenges = await syncChallengeProgress(supabase, user.id);

  let authorCard = null;
  if (finishedBook) {
    await syncActiveEventProgress(supabase, user.id);

    try {
      // "Boosted" = any weekend event is currently running, not specifically
      // that this book qualifies for that event's goal -- keeps the boost
      // simple (see chat) instead of re-running full goal-scoring here.
      const { data: activeEvents } = await supabase
        .from("weekend_events")
        .select("id")
        .eq("status", "active")
        .limit(1);
      const boosted = (activeEvents?.length ?? 0) > 0;

      authorCard = await awardAuthorCardForFinishedBook(supabase, user.id, bookId, boosted);
    } catch (err) {
      // Bonus collectible layer -- never let it block XP/streak/challenge
      // results the kid is waiting on.
      console.log("DEBUG author card award error:", JSON.stringify({ err: String(err) }));
    }
  }

  return NextResponse.json({
    xpGained,
    finishedBook,
    streak,
    completedChallenges,
    authorCard,
  });
}
