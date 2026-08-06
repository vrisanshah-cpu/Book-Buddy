import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, hasGeminiKey } from "@/lib/gemini";
import { containsProfanity } from "@/lib/profanity-filter";

const MODERATION_SYSTEM_PROMPT = `You moderate comments kids (ages 5-12) leave on each other's writing-competition stories. Reply with ONLY valid JSON, no markdown: {"approved": true or false}. Reject anything containing bullying, insults, harassment, cruelty, or content unsafe for children. Approve genuine, kind, or neutral feedback (including plain constructive criticism like "the ending felt rushed").`;

async function isCommentApproved(text: string): Promise<boolean> {
  if (containsProfanity(text)) return false;
  if (!hasGeminiKey()) return true; // fail-open to plain profanity filtering only, matching other AI-optional features

  try {
    const raw = await callGemini(MODERATION_SYSTEM_PROMPT, [{ role: "user", text }], { jsonMode: true });
    const parsed = JSON.parse(raw);
    return Boolean(parsed.approved);
  } catch {
    return true;
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId, commentText } = await request.json();
  const trimmed = (commentText ?? "").toString().trim();
  if (!submissionId) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
  if (!trimmed || trimmed.length > 500) {
    return NextResponse.json({ error: "Comment must be 1-500 characters" }, { status: 400 });
  }

  const { data: submission } = await supabase
    .from("writing_submissions")
    .select("id")
    .eq("id", submissionId)
    .eq("competition_id", params.id)
    .maybeSingle();
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const approved = await isCommentApproved(trimmed);

  const { data: comment, error } = await supabase
    .from("submission_comments")
    .insert({
      submission_id: submissionId,
      author_id: user.id,
      comment_text: trimmed,
      moderation_status: approved ? "approved" : "rejected",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!approved) {
    return NextResponse.json(
      { error: "That comment didn't pass our kindness check — try rephrasing it.", comment: null },
      { status: 400 }
    );
  }

  return NextResponse.json({ comment });
}
