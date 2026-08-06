import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreEntryForGoal, validateGoalSpec, getEventTheme, type GoalType, type GoalConfig, type GoalSpec } from "./weekend-events";

export { validateGoalSpec, getEventTheme };
export type { GoalType, GoalConfig, GoalSpec };

export interface ClassroomEventRow {
  id: string;
  classroom_id: string;
  goal_type: GoalType;
  goal_config: GoalConfig;
  starts_at: string;
  ends_at: string;
  status: "upcoming" | "active" | "closed";
}

/**
 * On-demand lifecycle sync for one classroom's events — flips
 * upcoming -> active once starts_at passes, and any non-closed event ->
 * closed (scoring every linked student and assigning ranks) once ends_at
 * passes. Called whenever classroom events are listed (GET
 * /api/classroom-events) instead of running on a schedule: unlike
 * platform-wide weekend events, this is a low-traffic per-classroom
 * feature, so a second Vercel cron job isn't worth it — the very next
 * person who opens the events list closes it for everyone.
 *
 * Must be called with the admin client — ranking touches every student's
 * entry row, not just the caller's own, so RLS would block most of it.
 */
export async function syncClassroomEventStatuses(admin: SupabaseClient, classroomId: string): Promise<void> {
  const nowIso = new Date().toISOString();

  await admin
    .from("classroom_events")
    .update({ status: "active" })
    .eq("classroom_id", classroomId)
    .eq("status", "upcoming")
    .lte("starts_at", nowIso);

  const { data: dueEvents } = await admin
    .from("classroom_events")
    .select("id, classroom_id, goal_type, goal_config, starts_at, ends_at, status")
    .eq("classroom_id", classroomId)
    .neq("status", "closed")
    .lte("ends_at", nowIso);

  if (!dueEvents?.length) return;

  const { data: students } = await admin.from("teacher_student").select("student_id").eq("classroom_id", classroomId);
  const studentIds = (students ?? []).map((s) => s.student_id as string);

  for (const event of dueEvents as ClassroomEventRow[]) {
    const scored: { userId: string; progress: number; qualifyingBookIds: string[] }[] = [];

    for (const studentId of studentIds) {
      const { progress, qualifyingBookIds } = await scoreEntryForGoal(
        admin,
        studentId,
        event.goal_type,
        event.goal_config,
        event.starts_at,
        event.ends_at
      );
      if (progress > 0) scored.push({ userId: studentId, progress, qualifyingBookIds });
    }

    scored.sort((a, b) => b.progress - a.progress);

    // Standard competition ranking, same as close-weekend-event: ties
    // share a rank, next rank skips (progress 5, 5, 3 -> ranks 1, 1, 3).
    let lastProgress: number | null = null;
    let lastRank = 0;
    for (let i = 0; i < scored.length; i++) {
      const entry = scored[i];
      const rank = entry.progress === lastProgress ? lastRank : i + 1;
      lastProgress = entry.progress;
      lastRank = rank;
      await admin.from("classroom_event_entries").upsert(
        {
          event_id: event.id,
          user_id: entry.userId,
          progress: entry.progress,
          qualifying_book_ids: entry.qualifyingBookIds,
          rank,
        },
        { onConflict: "event_id,user_id" }
      );
    }

    await admin.from("classroom_events").update({ status: "closed" }).eq("id", event.id);
  }
}

/** Explicit "I'm in!" registration — mirrors joinEvent() in weekend-events.ts for classroom_event_entries. */
export async function joinClassroomEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<{ error: string | null }> {
  const { data: existing } = await supabase
    .from("classroom_event_entries")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { error: null };

  const { error } = await supabase.from("classroom_event_entries").insert({
    event_id: eventId,
    user_id: userId,
    progress: 0,
    qualifying_book_ids: [],
  });

  return { error: error?.message ?? null };
}

/**
 * Called whenever a kid finishes a book (app/api/reading/log) — re-scores
 * them against every currently-active classroom event in any classroom
 * they belong to, mirroring syncActiveEventProgress() for weekend events.
 * Runs with the kid's own RLS-scoped client; "classroom_event_entries_*_own"
 * policies (migration 018) cover the upsert.
 */
export async function syncActiveClassroomEventProgress(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: memberships } = await supabase
    .from("teacher_student")
    .select("classroom_id")
    .eq("student_id", userId)
    .not("classroom_id", "is", null);

  const classroomIds = (memberships ?? [])
    .map((m: { classroom_id: string | null }) => m.classroom_id)
    .filter((id: string | null): id is string => Boolean(id));

  if (classroomIds.length === 0) return;

  const { data: activeEvents } = await supabase
    .from("classroom_events")
    .select("id, goal_type, goal_config, starts_at, ends_at")
    .in("classroom_id", classroomIds)
    .eq("status", "active");

  if (!activeEvents?.length) return;

  for (const event of activeEvents) {
    const { progress, qualifyingBookIds } = await scoreEntryForGoal(
      supabase,
      userId,
      event.goal_type as GoalType,
      event.goal_config as GoalConfig,
      event.starts_at,
      event.ends_at
    );

    if (progress > 0) {
      await supabase.from("classroom_event_entries").upsert(
        { event_id: event.id, user_id: userId, progress, qualifying_book_ids: qualifyingBookIds },
        { onConflict: "event_id,user_id" }
      );
    }
  }
}
