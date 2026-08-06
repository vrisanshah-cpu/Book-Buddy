import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, hasGeminiKey } from "@/lib/gemini";

const FEEDBACK_SYSTEM_PROMPT = `You give short, warm, encouraging writing feedback to kids ages 5-12 who just submitted a story to a writing competition. 2-4 sentences: point out one specific thing they did well, then one gentle, constructive suggestion. Age-appropriate, kind, never harsh. Plain text, no markdown.`;

// AI feedback is now opt-in infrastructure, not the default -- every
// submission used to trigger a Gemini call for feedback that isn't
// essential to the feature. Set ENABLE_AI_STORY_FEEDBACK=true to restore
// the old behavior. Default (unset/false) uses these hardcoded messages
// instead, at zero API cost.
const ENCOURAGING_FALLBACKS = [
  (title: string) =>
    `Great work finishing "${title}"! Keep practicing descriptive details in your next story — try adding what a character sees, hears, or feels.`,
  (title: string) =>
    `You did it — "${title}" is finished! One thing to try next time: give your main character a clear want, then a problem standing in the way.`,
  (title: string) =>
    `"${title}" is done and that's worth celebrating! For your next story, try starting in the middle of the action instead of at the very beginning.`,
  (title: string) =>
    `Nice job finishing "${title}"! Next time, try reading your story out loud — it's a great way to catch spots that could use more detail.`,
  (title: string) =>
    `You finished "${title}" — awesome! A fun challenge for next time: give your story a surprising ending nobody would expect.`,
];

function fallbackFeedback(title: string): string {
  const pick = ENCOURAGING_FALLBACKS[Math.floor(Math.random() * ENCOURAGING_FALLBACKS.length)];
  return pick(title);
}

function aiFeedbackEnabled(): boolean {
  return process.env.ENABLE_AI_STORY_FEEDBACK === "true";
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content } = await request.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
  }
  if (content.length > 10000) {
    return NextResponse.json({ error: "Story is too long (10,000 character max)" }, { status: 400 });
  }

  const { data: competition } = await supabase
    .from("writing_competitions")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!competition) return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  if (competition.status !== "active") {
    return NextResponse.json({ error: "This competition isn't open for submissions right now" }, { status: 400 });
  }

  let aiFeedback: string;
  if (aiFeedbackEnabled() && hasGeminiKey()) {
    try {
      aiFeedback = await callGemini(
        FEEDBACK_SYSTEM_PROMPT,
        [{ role: "user", text: `Title: ${title}\n\n${content}` }],
        { tier: "lite" }
      );
    } catch {
      aiFeedback = fallbackFeedback(title);
    }
  } else {
    aiFeedback = fallbackFeedback(title);
  }

  const { data: submission, error } = await supabase
    .from("writing_submissions")
    .insert({
      competition_id: params.id,
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      ai_feedback: aiFeedback,
    })
    .select()
    .single();

  if (error) {
    // unique(competition_id, author_id) -> already submitted
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ submission });
}
