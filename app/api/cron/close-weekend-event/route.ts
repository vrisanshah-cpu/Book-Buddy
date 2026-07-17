import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardXp } from "@/lib/challenges";
import {
  scoreEntryForGoal,
  goalMet,
  EVENT_XP,
  EVENT_BADGE_CODES,
  EVENT_TITLE_CODES,
  type GoalType,
  type GoalConfig,
} from "@/lib/weekend-events";

export const dynamic = "force-dynamic";

type AdminClient = ReturnType<typeof createAdminClient>;

interface DueEvent {
  id: string;
  goal_type: GoalType;
  goal_config: GoalConfig;
  starts_at: string;
  ends_at: string;
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Deliberately NOT gated on day-of-week like the generate route — "is it
  // time to close" is whether ends_at has passed, which is more reliable
  // than assuming Sunday-night timing on Vercel Hobby cron (only the hour
  // is guaranteed, not the minute), and it means a missed run gets caught
  // the next day.
  const { data: dueEvents, error: fetchError } = await admin
    .from("weekend_events")
    .select("id, goal_type, goal_config, starts_at, ends_at")
    .neq("status", "closed")
    .lte("ends_at", now);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!dueEvents?.length) {
    return NextResponse.json({ ok: true, closed: 0 });
  }

  for (const event of dueEvents as DueEvent[]) {
    await closeEvent(admin, event);
  }

  return NextResponse.json({ ok: true, closed: dueEvents.length });
}

async function closeEvent(admin: AdminClient, event: DueEvent) {
  const { data: kids } = await admin.from("users").select("id").eq("role", "kid");

  const scored: { userId: string; progress: number; qualifyingBookIds: string[] }[] = [];

  for (const kid of kids ?? []) {
    const { progress, qualifyingBookIds } = await scoreEntryForGoal(
      admin,
      kid.id,
      event.goal_type,
      event.goal_config,
      event.starts_at,
      event.ends_at
    );
    // Only rows for kids who actually made progress — avoids inserting a
    // zero-progress row for every kid in the app on every event.
    if (progress > 0) {
      scored.push({ userId: kid.id, progress, qualifyingBookIds });
    }
  }

  scored.sort((a, b) => b.progress - a.progress);

  // Standard competition ranking: ties share a rank, next rank skips
  // (progress 5, 5, 3 -> ranks 1, 1, 3).
  const ranked: { userId: string; progress: number; qualifyingBookIds: string[]; rank: number }[] = [];
  let lastProgress: number | null = null;
  let lastRank = 0;
  scored.forEach((entry, i) => {
    const rank = entry.progress === lastProgress ? lastRank : i + 1;
    lastProgress = entry.progress;
    lastRank = rank;
    ranked.push({ ...entry, rank });
  });

  for (const entry of ranked) {
    await admin.from("event_entries").upsert(
      {
        event_id: event.id,
        user_id: entry.userId,
        progress: entry.progress,
        qualifying_book_ids: entry.qualifyingBookIds,
        rank: entry.rank,
      },
      { onConflict: "event_id,user_id" }
    );

    const met = goalMet(event.goal_type, event.goal_config, entry.progress);

    // Placeholder tiers/amounts — confirm with project owner. Exclusive: a
    // user gets the single highest tier they qualify for, not all of them.
    if (entry.rank === 1) {
      await awardBadgeAndTitle(admin, entry.userId, event.id, EVENT_BADGE_CODES.champion, EVENT_TITLE_CODES.champion, EVENT_XP.champion);
    } else if (entry.rank <= 3) {
      await awardBadgeAndTitle(admin, entry.userId, event.id, EVENT_BADGE_CODES.top3, EVENT_TITLE_CODES.top3, EVENT_XP.top3);
    } else if (met) {
      await awardBadgeAndTitle(admin, entry.userId, event.id, EVENT_BADGE_CODES.finisher, EVENT_TITLE_CODES.finisher, EVENT_XP.finisher);
    }
  }

  await admin.from("weekend_events").update({ status: "closed" }).eq("id", event.id);
}

async function awardBadgeAndTitle(
  admin: AdminClient,
  userId: string,
  eventId: string,
  badgeCode: string,
  titleCode: string,
  xp: number
) {
  const { data: badge } = await admin.from("badges").select("id").eq("code", badgeCode).single();
  const { data: title } = await admin.from("titles").select("id").eq("code", titleCode).single();

  if (badge) {
    await admin
      .from("user_badges")
      .upsert(
        { user_id: userId, badge_id: badge.id, source_event_id: eventId },
        { onConflict: "user_id,badge_id,source_event_id" }
      );
  }
  if (title) {
    await admin
      .from("user_titles")
      .upsert(
        { user_id: userId, title_id: title.id, source_event_id: eventId },
        { onConflict: "user_id,title_id,source_event_id" }
      );
  }

  await awardXp(admin, userId, xp);
}