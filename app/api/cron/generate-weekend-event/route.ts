import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGemini, hasGeminiKey } from "@/lib/gemini";
import { containsProfanity } from "@/lib/profanity-filter";
import { validateGoalSpec, getUpcomingWeekendWindow } from "@/lib/weekend-events";

// Vercel Cron hits this on GET. Don't let Next.js cache this route.
export const dynamic = "force-dynamic";

// TEMP TEST — set to false (or remove this + the check below) once confirmed working
const FORCE_GENERATION_DAY = false;

const HOUSTON_TZ = "America/Chicago"; // Houston observes Central Time (handles CDT/CST automatically)

// Returns the current day-of-week (0=Sun ... 6=Sat) in a given IANA timezone
function getDayOfWeekInTimezone(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const weekdayStr = formatter.format(date); // "Mon", "Tue", etc.
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[weekdayStr];
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization");

  // TEMP DEBUG — remove after diagnosing the 401 issue
  console.log("DEBUG expected secret length:", secret?.length);
  console.log("DEBUG expected secret (raw):", JSON.stringify(secret));
  console.log("DEBUG received header (raw):", JSON.stringify(received));
  // END TEMP DEBUG

  if (!secret) return false;
  return received === `Bearer ${secret}`;
}

const PROMPT = `Design ONE fun weekend reading contest for kids aged 5-12 using a reading app.
Make it playful and different from a typical past contest. Choose exactly one goal_type:
- "books_count": finish N books
- "genre_diversity": finish books from N different genres
- "author_prefix": finish N books by an author whose last name starts with a given letter
- "topic": finish N books about a given topic/theme

Respond with ONLY JSON, no other text, in exactly this shape:
{
  "title": string (max 60 chars, fun and exciting),
  "description": string (max 160 chars, explains the challenge to a kid),
  "goal_type": "books_count" | "genre_diversity" | "author_prefix" | "topic",
  "goal_config": an object shaped like { "target": integer } for books_count/genre_diversity,
                 { "prefix": "S" } (single letter) for author_prefix,
                 or { "topic": "short phrase", "target": integer } for topic
}
Keep targets achievable inside a single weekend (1-3 books).`;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Housekeeping every time this fires: promote any 'upcoming' event whose
  // start time has already arrived.
  await admin
    .from("weekend_events")
    .update({ status: "active" })
    .eq("status", "upcoming")
    .lte("starts_at", now.toISOString());

  // Vercel Hobby only supports daily cron, so this route runs every day —
  // this day-of-week check is what actually enforces "once a week" rather
  // than the cron schedule itself. Only generate on Fridays in Houston time,
  // for the upcoming Sat–Sun.
  if (!FORCE_GENERATION_DAY && getDayOfWeekInTimezone(now, HOUSTON_TZ) !== 5) {
    return NextResponse.json({ ok: true, skipped: "not-generation-day" });
  }

  const { startsAt, endsAt } = getUpcomingWeekendWindow(now);

  const { data: existing } = await admin
    .from("weekend_events")
    .select("id")
    .eq("starts_at", startsAt.toISOString())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, skipped: "already-exists" });
  }

  if (!hasGeminiKey()) {
    return NextResponse.json({ ok: true, skipped: "no-ai-key" });
  }

  let parsed;
  try {
    const raw = await callGemini(
      "You design short, fun weekend reading contests for kids aged 5-12. Always respond with strict JSON only.",
      [{ role: "user", text: PROMPT }],
      { jsonMode: true }
    );
    parsed = validateGoalSpec(JSON.parse(raw));
  } catch (err) {
    // TEMP DEBUG — surface why validation/parsing failed
    console.log("DEBUG gemini/validation error:", err);
    parsed = null;
  }

  if (!parsed) {
    return NextResponse.json({ ok: true, skipped: "invalid-ai-output" });
  }

  if (containsProfanity(parsed.title) || containsProfanity(parsed.description)) {
    return NextResponse.json({ ok: true, skipped: "profanity-filtered" });
  }

  const { error } = await admin.from("weekend_events").insert({
    title: parsed.title,
    description: parsed.description,
    goal_type: parsed.goal_type,
    goal_config: parsed.goal_config,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: "upcoming",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true });
}