import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGemini, hasGeminiKey } from "@/lib/gemini";
import { containsProfanity } from "@/lib/profanity-filter";
import { validateGoalSpec, getEventTheme, type GoalType, type GoalConfig } from "@/lib/weekend-events";

/**
 * POST /api/admin/reading-events/generate
 *
 * The "Events" page (/kids/events) and "Challenges" page (/kids/challenges)
 * are two separate systems on two separate tables (weekend_events vs.
 * challenges) — this is the Events counterpart to
 * /api/admin/reading-challenges/generate, which only ever wrote to
 * challenges and was never going to show up here. That was the actual
 * bug report; this route is the real fix.
 *
 * Reuses the exact same goal validation (validateGoalSpec) and theming
 * (getEventTheme) already used by app/api/cron/generate-weekend-event —
 * that route lets AI pick the goal_type/goal_config autonomously every
 * Friday; this one is the admin-driven version where the admin picks the
 * goal_type and every number (target/prefix/topic) themselves, and AI is
 * only ever used for the title/description copy. No new schema needed:
 * weekend_events already has everything this requires.
 *
 * Note: weekend_events' goal_type is fixed to books_count /
 * genre_diversity / author_prefix / topic, all capped at a target of 1-10
 * (validateGoalSpec) — there's no "minutes read" equivalent here. That's
 * a real, existing constraint of the Events system, not something this
 * route works around.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { goalType, target, prefix, topic, startsAt, endsAt, rawNotes } = (await request.json()) as {
    goalType?: GoalType;
    target?: number;
    prefix?: string;
    topic?: string;
    startsAt?: string;
    endsAt?: string;
    rawNotes?: string;
  };

  if (!goalType || !["books_count", "genre_diversity", "author_prefix", "topic"].includes(goalType)) {
    return NextResponse.json({ error: "Invalid goal type" }, { status: 400 });
  }
  if (!startsAt || !endsAt) {
    return NextResponse.json({ error: "Start and end date/time are both required" }, { status: 400 });
  }
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }
  if (!rawNotes?.trim()) {
    return NextResponse.json({ error: "Give the AI something to work with (theme, tone, etc.)" }, { status: 400 });
  }

  const goalConfig: GoalConfig = {};
  let goalDescriptionForAI = "";
  if (goalType === "books_count" || goalType === "genre_diversity") {
    if (!target || !Number.isFinite(target) || target < 1 || target > 10) {
      return NextResponse.json({ error: "Target must be between 1 and 10" }, { status: 400 });
    }
    goalConfig.target = Math.round(target);
    goalDescriptionForAI =
      goalType === "books_count"
        ? `finish ${goalConfig.target} book${goalConfig.target === 1 ? "" : "s"}`
        : `finish books from ${goalConfig.target} different genres`;
  } else if (goalType === "author_prefix") {
    if (!prefix?.trim() || prefix.trim().length > 3) {
      return NextResponse.json({ error: "Prefix must be 1-3 letters" }, { status: 400 });
    }
    goalConfig.prefix = prefix.trim();
    goalDescriptionForAI = `finish a book by an author whose last name starts with "${goalConfig.prefix}"`;
  } else {
    if (!topic?.trim() || !target || !Number.isFinite(target) || target < 1 || target > 10) {
      return NextResponse.json({ error: "Topic and a target between 1 and 10 are both required" }, { status: 400 });
    }
    goalConfig.topic = topic.trim();
    goalConfig.target = Math.round(target);
    goalDescriptionForAI = `finish ${goalConfig.target} book${goalConfig.target === 1 ? "" : "s"} about ${goalConfig.topic}`;
  }

  let title = "";
  let description = "";
  let aiUsed = false;

  if (hasGeminiKey()) {
    const prompt = `Write copy for a weekend reading contest for kids aged 5-12. The goal is fixed — kids must ${goalDescriptionForAI}. Do NOT change or restate the goal as different numbers, just write exciting copy that fits it.
Admin notes (theme, tone, anything else): ${rawNotes.trim()}

Respond with ONLY JSON, no other text, in exactly this shape:
{"title": string (max 60 chars, fun and exciting), "description": string (max 160 chars, explains the challenge to a kid, must mention the actual goal)}`;

    try {
      const raw = await callGemini(
        "You write short, exciting, age-appropriate copy for a kids' reading app. Always respond with strict JSON only. Never change the goal you're given.",
        [{ role: "user", text: prompt }],
        { jsonMode: true, tier: "lite" }
      );
      const parsed = JSON.parse(raw);
      if (typeof parsed.title === "string" && typeof parsed.description === "string") {
        title = parsed.title.trim();
        description = parsed.description.trim();
        aiUsed = true;
      }
    } catch {
      // fall through to fallback below
    }
  }

  if (!title || !description) {
    title = `Weekend Reading: ${goalDescriptionForAI}`;
    description = `This weekend's challenge: ${goalDescriptionForAI}. Good luck!`;
    aiUsed = false;
  }

  if (containsProfanity(title) || containsProfanity(description) || containsProfanity(rawNotes)) {
    return NextResponse.json({ error: "That generated something that didn't pass the content filter — try different notes." }, { status: 400 });
  }

  const spec = validateGoalSpec({ title, description, goal_type: goalType, goal_config: goalConfig });
  if (!spec) {
    return NextResponse.json({ error: "Generated content didn't pass validation — try again." }, { status: 500 });
  }

  const now = Date.now();
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const status = now < startMs ? "upcoming" : now < endMs ? "active" : "closed";

  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("weekend_events")
    .insert({
      title: spec.title,
      description: spec.description,
      goal_type: spec.goal_type,
      goal_config: spec.goal_config,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      status,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const theme = getEventTheme(spec.goal_type, spec.title, spec.description);

  return NextResponse.json({ event, theme, aiUsed });
}
