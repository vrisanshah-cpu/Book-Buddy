import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardXp, syncChallengeProgress } from "@/lib/challenges";
import { XP_REWARDS } from "@/lib/xp";
import { buildDemoQuiz } from "@/lib/demo-quiz";
import { callGemini, hasGeminiKey } from "@/lib/gemini";

const QUIZ_SYSTEM_PROMPT = `You are a reading comprehension quiz generator for children ages 5-12.
Generate exactly 5 multiple choice questions about the book provided.
Each question should have 4 answer options (A, B, C, D) with exactly one correct answer.
Return ONLY valid JSON in this format:
{"questions": [{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": "A"}]}`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === "generate") {
    const { title, author, description } = body;

    if (!hasGeminiKey()) {
      return NextResponse.json(buildDemoQuiz(title ?? "this book", author ?? "the author"));
    }

    try {
      const raw = await callGemini(
        QUIZ_SYSTEM_PROMPT,
        [
          {
            role: "user",
            text: `Book: "${title}" by ${author}. ${description ? `Summary: ${description}` : ""}`,
          },
        ],
        { jsonMode: true }
      );
      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json(buildDemoQuiz(title, author));
    }
  }

  if (action === "submit") {
    const { bookId, score, correct, total } = body;
    await supabase.from("reading_game_scores").insert({
      user_id: user.id,
      book_id: bookId,
      score,
      questions_correct: correct,
      questions_total: total,
    });

    let xpGained = Math.round((score / 100) * 30);
    if (score === 100) {
      xpGained += XP_REWARDS.perfect_quiz;
    }
    await awardXp(supabase, user.id, xpGained);
    const completedChallenges = await syncChallengeProgress(supabase, user.id);

    return NextResponse.json({ xpGained, completedChallenges });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}