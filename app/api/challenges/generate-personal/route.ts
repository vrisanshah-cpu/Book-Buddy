import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGemini, hasGeminiKey } from "@/lib/gemini";
import { calculateStreak } from "@/lib/reading-stats";

const VALID_TYPES = ["reading_streak", "books_finished", "minutes_read", "quiz_score"];

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If this student already has an active personalized challenge, don't make another.
  const { data: existing } = await supabase
    .from("user_challenges")
    .select("id, challenge:challenges!inner(id, personalized_for)")
    .eq("user_id", user.id)
    .eq("completed", false)
    .eq("challenge.personalized_for", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyExists: true });
  }

  if (!hasGeminiKey()) {
    return NextResponse.json({ ok: true, skipped: "no-ai-key" });
  }

  const [{ data: sessions }, { data: finishedBooks }, { data: gameScores }] = await Promise.all([
    supabase.from("reading_sessions").select("date, minutes_read").eq("user_id", user.id),
    supabase.from("user_books").select("finished_at").eq("user_id", user.id).eq("status", "finished"),
    supabase.from("reading_game_scores").select("score").eq("user_id", user.id),
  ]);

  const streak = calculateStreak(sessions ?? []);
  const totalMinutes = (sessions ?? []).reduce((a, s) => a + (s.minutes_read ?? 0), 0);
  const booksFinished = finishedBooks?.length ?? 0;
  const bestQuiz = Math.max(0, ...(gameScores?.map((g) => g.score) ?? [0]));

  const prompt = `A child using a reading app has this activity so far: current streak ${streak} days, total minutes read ${totalMinutes}, books finished ${booksFinished}, best quiz score ${bestQuiz}.
Create ONE fun, encouraging, age-appropriate reading challenge just for them, slightly above their current level so it's achievable but a real stretch.
Respond with ONLY JSON, no other text, in exactly this shape:
{"title": string (max 40 chars), "description": string (max 100 chars), "type": one of "reading_streak" | "books_finished" | "minutes_read" | "quiz_score", "target_value": integer, "badge_icon": a single emoji}`;

  let parsed: {
    title: string;
    description: string;
    type: string;
    target_value: number;
    badge_icon: string;
  };

  try {
    const raw = await callGemini(
      "You create short, fun reading challenges for kids aged 5-12. Always respond with strict JSON only.",
      [{ role: "user", text: prompt }],
      { jsonMode: true }
    );
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true, skipped: "ai-error" });
  }

  if (!VALID_TYPES.includes(parsed.type) || !parsed.target_value || parsed.target_value <= 0) {
    return NextResponse.json({ ok: true, skipped: "invalid-ai-output" });
  }

  const admin = createAdminClient();
  const { data: challenge, error: insertError } = await admin
    .from("challenges")
    .insert({
      title: parsed.title.slice(0, 40),
      description: parsed.description?.slice(0, 100) ?? null,
      type: parsed.type,
      target_value: Math.round(parsed.target_value),
      badge_icon: parsed.badge_icon || "🏆",
      created_by: null,
      classroom_id: null,
      personalized_for: user.id,
    })
    .select("id")
    .single();

  if (insertError || !challenge) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to create challenge" }, { status: 500 });
  }

  const { error: enrollError } = await supabase.from("user_challenges").insert({
    user_id: user.id,
    challenge_id: challenge.id,
    progress: 0,
    completed: false,
  });

  if (enrollError) {
    return NextResponse.json({ error: enrollError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true });
}