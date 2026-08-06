import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, hasGeminiKey } from "@/lib/gemini";

const FEEDBACK_SYSTEM_PROMPT = `You give short, warm, encouraging writing feedback to kids ages 5-12 who just submitted a story to a writing competition. 2-4 sentences: point out one specific thing they did well, then one gentle, constructive suggestion. Age-appropriate, kind, never harsh. Plain text, no markdown.`;

function fallbackFeedback(title: string): string {
  return `Great work finishing "${title}"! Keep practicing descriptive details in your next story — try adding what a character sees, hears, or feels.`;
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
  if (hasGeminiKey()) {
    try {
      aiFeedback = await callGemini(FEEDBACK_SYSTEM_PROMPT, [{ role: "user", text: `Title: ${title}\n\n${content}` }]);
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
