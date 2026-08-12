import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGemini, hasGeminiKey } from "@/lib/gemini";

const VALID_TYPES = ["reading_streak", "books_finished", "minutes_read", "quiz_score"];

/**
 * POST /api/admin/reading-challenges/generate
 *
 * Admin supplies the facts (type, target, dates, freeform notes on theme /
 * age group / rules); AI only formats them into a title, description,
 * tagline, and badge emoji — it never invents the target number itself,
 * so a wrong AI guess can't create a challenge nobody can actually
 * complete. Same callGemini() pattern as
 * app/api/challenges/generate-personal, just admin-authored and global
 * (or classroom-scoped) instead of personalized to one student.
 *
 * Inserts into the existing `challenges` table (migrations 001/008/009/015)
 * rather than a new table — a reading competition IS a challenge; the only
 * new column this needed was `tagline` (migration 034).
 *
 * challenges_title_global_unique (migration 011) enforces one global
 * challenge per exact title. Two things guard against hitting it: recent
 * titles are excluded from the prompt so the AI doesn't repeat itself, and
 * a 23505 (Postgres unique-violation) on insert gets caught and turned into
 * a message the admin can actually act on, instead of a raw constraint name.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { type, targetValue, rawNotes, startDate, endDate, classroomId } = (await request.json()) as {
    type?: string;
    targetValue?: number;
    rawNotes?: string;
    startDate?: string | null;
    endDate?: string | null;
    classroomId?: string | null;
  };

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!targetValue || !Number.isFinite(targetValue) || targetValue <= 0) {
    return NextResponse.json({ error: "targetValue must be a positive number" }, { status: 400 });
  }
  if (!rawNotes?.trim()) {
    return NextResponse.json({ error: "Give the AI something to work with (theme, age group, rules, etc.)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const isGlobal = !classroomId;

  // Only global challenges (classroom_id is null) hit
  // challenges_title_global_unique, so only fetch/exclude for that case.
  let recentTitles: string[] = [];
  if (isGlobal) {
    const { data: recent } = await admin
      .from("challenges")
      .select("title")
      .is("classroom_id", null)
      .is("personalized_for", null)
      .order("id", { ascending: false })
      .limit(15);
    recentTitles = (recent ?? []).map((r) => r.title).filter(Boolean);
  }

  let formatted: { title: string; description: string; tagline: string; badge_icon: string };

  if (hasGeminiKey()) {
    const exclusionLine =
      recentTitles.length > 0
        ? `\nDo NOT reuse any of these existing titles, or anything nearly identical to them — pick something clearly different even if the theme notes are similar: ${recentTitles.join(", ")}.`
        : "";

    const prompt = `Format a reading competition for a kids' reading app (ages 5-12) from these admin-supplied facts. Do NOT change the numbers — only write the copy.
Type: ${type}
Target: ${targetValue}
Admin notes (theme, age group, rules, anything else): ${rawNotes.trim()}
${exclusionLine}

Respond with ONLY JSON, no other text, in exactly this shape:
{"title": string (max 40 chars, punchy), "description": string (max 120 chars, tells the kid exactly what to do to win), "tagline": string (max 60 chars, short and exciting, goes on the banner), "badge_icon": a single emoji}`;

    try {
      const raw = await callGemini(
        "You write short, exciting, age-appropriate copy for reading challenges aimed at kids 5-12. Always respond with strict JSON only. Never invent or change the numeric target you're given. Never reuse a title you've been told already exists.",
        [{ role: "user", text: prompt }],
        { jsonMode: true, tier: "lite" }
      );
      formatted = JSON.parse(raw);
    } catch {
      formatted = fallbackFormat(type, targetValue, rawNotes);
    }
  } else {
    formatted = fallbackFormat(type, targetValue, rawNotes);
  }

  const { data: challenge, error } = await admin
    .from("challenges")
    .insert({
      title: (formatted.title || "New Reading Challenge").slice(0, 40),
      description: (formatted.description || rawNotes.trim()).slice(0, 120),
      tagline: formatted.tagline?.slice(0, 60) ?? null,
      type,
      target_value: Math.round(targetValue),
      badge_icon: formatted.badge_icon || "🏆",
      created_by: user.id,
      classroom_id: classroomId || null,
      start_date: startDate || null,
      end_date: endDate || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A global challenge with that exact title already exists. Try more specific or different theme notes so the AI generates a different title, or scope this one to a single classroom instead of making it global.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ challenge, aiUsed: hasGeminiKey() });
}

// Used when no Gemini key is configured, or the AI call/parse fails —
// same "demo-quiz"-style graceful fallback the rest of the app already
// leans on (see lib/demo-quiz.ts) rather than blocking challenge creation
// on AI availability.
function fallbackFormat(type: string, targetValue: number, rawNotes: string) {
  const TYPE_LABEL: Record<string, string> = {
    reading_streak: "day reading streak",
    books_finished: "books finished",
    minutes_read: "minutes read",
    quiz_score: "quiz score",
  };
  return {
    title: `${targetValue} ${TYPE_LABEL[type] ?? type} — ${Date.now().toString(36).slice(-4)}`.slice(0, 40),
    description: rawNotes.trim().slice(0, 120),
    tagline: "New challenge — go for it!",
    badge_icon: "🏆",
  };
}
