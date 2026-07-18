import type { SupabaseClient } from "@supabase/supabase-js";
import { callGemini } from "./gemini";

export type GoalType = "books_count" | "genre_diversity" | "author_prefix" | "topic";

export interface GoalConfig {
  target?: number;
  prefix?: string;
  topic?: string;
}

// Placeholder amounts — confirm exact numbers before this goes live. Tiers
// are exclusive: a user gets the single highest tier they qualify for.
export const EVENT_XP = {
  finisher: 100,
  top3: 300,
  champion: 1000,
} as const;

export const EVENT_BADGE_CODES = {
  finisher: "event_finisher",
  top3: "event_top3",
  champion: "event_champion",
} as const;

export const EVENT_TITLE_CODES = {
  finisher: "finisher",
  top3: "podium",
  champion: "champion",
} as const;

interface FinishedBookRow {
  book_id: string;
  finished_at: string;
  title: string;
  author: string;
  description: string | null;
  genre: string | null;
}

/**
 * Every book a user finished inside [startsAt, endsAt]. Only ever filters by
 * the given userId, so it's safe with either the normal user-scoped client
 * (RLS just confirms the caller can only see their own rows) or the
 * service-role admin client (used by the close-event cron to loop over
 * every kid).
 */
export async function getFinishedBooksInWindow(
  supabase: SupabaseClient,
  userId: string,
  startsAt: string,
  endsAt: string
): Promise<FinishedBookRow[]> {
  const { data } = await supabase
    .from("user_books")
    .select("book_id, finished_at, book:books(title, author, description, genre)")
    .eq("user_id", userId)
    .eq("status", "finished")
    .gte("finished_at", startsAt)
    .lte("finished_at", endsAt);

  return (data ?? []).map((row) => {
    const b = Array.isArray(row.book) ? row.book[0] : row.book;
    const book = b as { title?: string; author?: string; description?: string | null; genre?: string | null } | null;
    return {
      book_id: row.book_id as string,
      finished_at: row.finished_at as string,
      title: book?.title ?? "Unknown title",
      author: book?.author ?? "Unknown author",
      description: book?.description ?? null,
      genre: book?.genre ?? null,
    };
  });
}

async function isBookRelevantToTopic(
  title: string,
  author: string,
  description: string | null,
  topic: string
): Promise<boolean> {
  try {
    const raw = await callGemini(
      "You judge whether a children's book matches a topic. Respond with ONLY strict JSON, no other text.",
      [
        {
          role: "user",
          text: `Book: "${title}" by ${author}. Description: ${description ?? "(none available)"}.
Topic: "${topic}".
On a scale of 0-10, how relevant is this book to the topic for a child reader?
Respond with ONLY JSON in exactly this shape: {"score": integer 0-10}`,
        },
      ],
      { jsonMode: true }
    );
    const parsed = JSON.parse(raw);
    const score = Number(parsed.score);
    // TEMP DEBUG — remove once topic-scoring is confirmed working
    console.log("DEBUG topic score:", JSON.stringify({ title, topic, raw, score }));
    return Number.isFinite(score) && score >= 6;
  } catch (err) {
    // TEMP DEBUG — remove once topic-scoring is confirmed working
    console.log("DEBUG topic scoring error:", JSON.stringify({ title, topic, err: String(err) }));
    // Fail closed — don't award credit for a book we couldn't verify.
    return false;
  }
}

/**
 * Scores one user's progress toward a weekend event's goal. For goal_type
 * "topic" this makes one Gemini call per finished book in the window — fine
 * for a weekend's worth of books per kid, would need batching at real scale.
 */
export async function scoreEntryForGoal(
  supabase: SupabaseClient,
  userId: string,
  goalType: GoalType,
  goalConfig: GoalConfig,
  startsAt: string,
  endsAt: string
): Promise<{ progress: number; qualifyingBookIds: string[] }> {
  const books = await getFinishedBooksInWindow(supabase, userId, startsAt, endsAt);

  if (goalType === "books_count") {
    return { progress: books.length, qualifyingBookIds: books.map((b) => b.book_id) };
  }

  if (goalType === "genre_diversity") {
    const seenGenres = new Set<string>();
    const qualifying: string[] = [];
    for (const b of books) {
      if (b.genre && !seenGenres.has(b.genre)) {
        seenGenres.add(b.genre);
        qualifying.push(b.book_id);
      }
    }
    return { progress: seenGenres.size, qualifyingBookIds: qualifying };
  }

  if (goalType === "author_prefix") {
    const prefix = (goalConfig.prefix ?? "").trim().toLowerCase();
    const matches = books.filter((b) => b.author.toLowerCase().startsWith(prefix));
    return { progress: matches.length, qualifyingBookIds: matches.map((b) => b.book_id) };
  }

  if (goalType === "topic") {
    const topic = goalConfig.topic ?? "";
    const qualifying: string[] = [];
    for (const b of books) {
      const relevant = await isBookRelevantToTopic(b.title, b.author, b.description, topic);
      if (relevant) qualifying.push(b.book_id);
    }
    return { progress: qualifying.length, qualifyingBookIds: qualifying };
  }

  return { progress: 0, qualifyingBookIds: [] };
}

export function goalMet(goalType: GoalType, goalConfig: GoalConfig, progress: number): boolean {
  const target = Number(goalConfig.target ?? 1);
  return progress >= target;
}

/** Saturday 00:00:00 UTC through Sunday 23:59:59.999 UTC of the coming weekend. */
export function getUpcomingWeekendWindow(now: Date): { startsAt: Date; endsAt: Date } {
  const day = now.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const daysUntilSaturday = (6 - day + 7) % 7;
  const startsAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSaturday, 0, 0, 0, 0)
  );
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 1);
  endsAt.setUTCHours(23, 59, 59, 999);
  return { startsAt, endsAt };
}

export interface GoalSpec {
  title: string;
  description: string;
  goal_type: GoalType;
  goal_config: GoalConfig;
}

/** Validates the shape of whatever Gemini returns before anything gets inserted. */
export function validateGoalSpec(raw: unknown): GoalSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const { title, description, goal_type, goal_config } = r;

  if (typeof title !== "string" || !title.trim()) return null;
  if (typeof description !== "string" || !description.trim()) return null;
  if (goal_type !== "books_count" && goal_type !== "genre_diversity" && goal_type !== "author_prefix" && goal_type !== "topic") {
    return null;
  }
  if (!goal_config || typeof goal_config !== "object") return null;
  const config = goal_config as Record<string, unknown>;

  if (goal_type === "books_count" || goal_type === "genre_diversity") {
    const target = Number(config.target);
    if (!Number.isFinite(target) || target < 1 || target > 10) return null;
    return {
      title: title.slice(0, 60),
      description: description.slice(0, 160),
      goal_type,
      goal_config: { target: Math.round(target) },
    };
  }

  if (goal_type === "author_prefix") {
    const prefix = String(config.prefix ?? "").trim();
    if (!prefix || prefix.length > 3) return null;
    return {
      title: title.slice(0, 60),
      description: description.slice(0, 160),
      goal_type,
      goal_config: { prefix },
    };
  }

  // topic
  const topic = String(config.topic ?? "").trim();
  const target = Number(config.target);
  if (!topic || !Number.isFinite(target) || target < 1 || target > 10) return null;
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    goal_type,
    goal_config: { topic, target: Math.round(target) },
  };
}

/**
 * Called live whenever a kid finishes a book. Re-scores that kid against
 * every currently-active weekend event and upserts their event_entries row,
 * so progress shows up immediately instead of only after close-weekend-event
 * runs. Deliberately does NOT touch `rank` — ranks are only meaningful once
 * an event closes and everyone's final numbers are in, so we leave rank null
 * here and let close-weekend-event assign it.
 */
export async function syncActiveEventProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: activeEvents } = await supabase
    .from("weekend_events")
    .select("id, goal_type, goal_config, starts_at, ends_at")
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

    // TEMP DEBUG — remove once live progress is confirmed working
    console.log(
      "DEBUG syncActiveEventProgress:",
      JSON.stringify({ eventId: event.id, goalType: event.goal_type, progress, qualifyingBookIds })
    );

    if (progress > 0) {
      await supabase.from("event_entries").upsert(
        {
          event_id: event.id,
          user_id: userId,
          progress,
          qualifying_book_ids: qualifyingBookIds,
        },
        { onConflict: "event_id,user_id" }
      );
    }
  }
}
