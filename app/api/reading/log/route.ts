import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardXp, syncChallengeProgress } from "@/lib/challenges";
import { XP_REWARDS } from "@/lib/xp";
import { calculateStreak } from "@/lib/reading-stats";
import { syncActiveEventProgress } from "@/lib/weekend-events";
import { awardCollectibleForFinishedBook } from "@/lib/author-cards";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { bookId, userBookId, minutesRead, pagesRead, progressPercent, markFinished } = body;

  if (!bookId || minutesRead == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (progressPercent != null) {
    updates.progress_percent = Math.min(100, Math.max(0, Number(progressPercent)));
  }
  if (markFinished) {
    updates.status = "finished";
    updates.progress_percent = 100;
    updates.finished_at = new Date().toISOString();
  }
  const finishedBook = Boolean(markFinished || updates.status === "finished");

  // These two writes touch different tables and don't depend on each
  // other's result -- running them together instead of sequentially was
  // one of the bigger contributors to the felt lag on this endpoint.
  await Promise.all([
    supabase.from("reading_sessions").insert({
      user_id: user.id,
      book_id: bookId,
      minutes_read: Number(minutesRead) || 0,
      pages_read: Number(pagesRead) || 0,
      date: new Date().toISOString().split("T")[0],
    }),
    userBookId && Object.keys(updates).length > 0
      ? supabase.from("user_books").update(updates).eq("id", userBookId)
      : Promise.resolve(),
  ]);

  // Was two sequential awardXp calls (each its own select-then-update round
  // trip) -- now one call for the combined total.
  const xpGained = XP_REWARDS.reading_session + (finishedBook ? XP_REWARDS.finish_book : 0);
  await awardXp(supabase, user.id, xpGained);

  const [{ data: sessions }, completedChallenges] = await Promise.all([
    supabase.from("reading_sessions").select("date, minutes_read").eq("user_id", user.id),
    syncChallengeProgress(supabase, user.id),
  ]);

  const streak = calculateStreak(sessions ?? []);

  let collectible = null;
  if (finishedBook) {
    // Event-progress sync and the collectible roll touch unrelated tables
    // -- run them together. The card roll is wrapped so a failure there
    // can never block the XP/streak/challenge results the kid is already
    // waiting on.
    const [, cardResult] = await Promise.all([
      syncActiveEventProgress(supabase, user.id),
      (async () => {
        try {
          // "Boosted" = any weekend event is currently running, not
          // specifically that this book qualifies for that event's goal --
          // keeps the boost simple instead of re-running full
          // goal-scoring here.
          const { data: activeEvents } = await supabase
            .from("weekend_events")
            .select("id")
            .eq("status", "active")
            .limit(1);
          const boosted = (activeEvents?.length ?? 0) > 0;
          return await awardCollectibleForFinishedBook(supabase, user.id, bookId, boosted);
        } catch {
          return null;
        }
      })(),
    ]);
    collectible = cardResult;
  }

  return NextResponse.json({
    xpGained,
    finishedBook,
    streak,
    completedChallenges,
    // field name kept as "authorCard" for client compatibility, though it
    // now covers item/location drops too, not just authors
    authorCard: collectible,
  });
}
