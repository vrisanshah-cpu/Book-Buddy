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
      const { error } = await supabase.from("event_entries").upsert(
        {
          event_id: event.id,
          user_id: userId,
          progress,
          qualifying_book_ids: qualifyingBookIds,
        },
        { onConflict: "event_id,user_id" }
      );
      // TEMP DEBUG — remove once live progress is confirmed working. A
      // silent RLS failure (e.g. migration 013 never actually run in
      // Supabase) previously looked identical to "book didn't qualify".
      if (error) {
        console.log("DEBUG event_entries upsert error:", JSON.stringify({ eventId: event.id, error }));
      }
    }
  }
}

/**
 * Explicit "I'm in!" registration. Inserts a zero-progress event_entries row
 * immediately so the kid gets visible confirmation of joining, instead of
 * only ever seeing themselves on the board once they finish a qualifying
 * book (which, per syncActiveEventProgress above, only writes a row once
 * progress > 0). Safe to call repeatedly — onConflict ignores an existing
 * row rather than resetting real progress back to 0.
 */
export async function joinEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<{ error: string | null }> {
  const { data: existing } = await supabase
    .from("event_entries")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { error: null };

  const { error } = await supabase.from("event_entries").insert({
    event_id: eventId,
    user_id: userId,
    progress: 0,
    qualifying_book_ids: [],
  });

  return { error: error?.message ?? null };
}

export interface EventTheme {
  emoji: string;
  gradient: string; // tailwind gradient classes
  accent: string; // tailwind text/bg color class fragment
}

/**
 * Purely visual — picks an emoji + color theme from the goal_type and
 * title/description keywords, so generated events (which vary every week)
 * still feel distinct rather than uniformly purple.
 */
export function getEventTheme(goalType: GoalType, title: string, description: string): EventTheme {
  const text = `${title} ${description}`.toLowerCase();

  if (/space|astronaut|planet|alien|galaxy|rocket/.test(text)) {
    return { emoji: "🚀", gradient: "from-indigo-600 via-violet-600 to-purple-700", accent: "indigo" };
  }
  if (/ocean|sea|underwater|pirate|island/.test(text)) {
    return { emoji: "🌊", gradient: "from-cyan-500 via-teal-500 to-blue-600", accent: "teal" };
  }
  if (/dragon|magic|wizard|fairy|myth/.test(text)) {
    return { emoji: "🐉", gradient: "from-fuchsia-600 via-pink-600 to-rose-600", accent: "pink" };
  }
  if (/animal|jungle|forest|wild/.test(text)) {
    return { emoji: "🦁", gradient: "from-amber-500 via-orange-500 to-yellow-500", accent: "amber" };
  }
  if (/mystery|detective|spy|clue/.test(text)) {
    return { emoji: "🕵️", gradient: "from-slate-700 via-slate-600 to-zinc-700", accent: "slate" };
  }

  switch (goalType) {
    case "genre_diversity":
      return { emoji: "🎨", gradient: "from-fuchsia-500 via-purple-500 to-indigo-500", accent: "purple" };
    case "author_prefix":
      return { emoji: "✍️", gradient: "from-emerald-500 via-teal-500 to-cyan-500", accent: "emerald" };
    case "topic":
      return { emoji: "🔭", gradient: "from-violet-600 via-purple-600 to-fuchsia-600", accent: "violet" };
    default:
      return { emoji: "📚", gradient: "from-kids-purple via-purple-600 to-indigo-600", accent: "purple" };
  }
}
