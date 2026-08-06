import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, hasGeminiKey } from "@/lib/gemini";
import { containsProfanity } from "@/lib/profanity-filter";
import { needsModerationReview } from "@/lib/comment-risk-heuristics";

const MODERATION_SYSTEM_PROMPT = `You moderate comments kids (ages 5-12) leave on each other's writing-competition stories. Reply with ONLY valid JSON, no markdown: {"approved": true or false}. Reject anything containing bullying, insults, harassment, cruelty, or content unsafe for children. Approve genuine, kind, or neutral feedback (including plain constructive criticism like "the ending felt rushed").`;

// Three-stage moderation, each stage only running if the one before it
// didn't already decide:
//  1. Profanity filter (free, instant) -- reject immediately on a match.
//  2. Heuristic risk check (free, instant) -- catches non-profane
//     cruelty ("nobody likes this," "you're so stupid"). If nothing
//     trips it, approve without ever calling Gemini -- this covers the
//     large majority of comments, which are genuine and kind.
//  3. Gemini (only for the flagged minority) -- a real judgment call on
//     comments that might be harsh sarcasm, backhanded "feedback," or
//     something the keyword list can't cleanly resolve either way.
// This keeps a real safety net for the cases that matter while cutting
// Gemini calls to a small fraction of total comment volume.
async function isCommentApproved(text: string): Promise<boolean> {
  if (containsProfanity(text)) return false;
  if (!needsModerationReview(text)) return true;
  if (!hasGeminiKey()) return false; // flagged as risky and no AI available -- reject rather than fail-open

  try {
    const raw = await callGemini(MODERATION_SYSTEM_PROMPT, [{ role: "user", text }], {
      jsonMode: true,
      tier: "lite",
    });
    const parsed = JSON.parse(raw);
    return Boolean(parsed.approved);
  } catch {
    return false; // flagged as risky and Gemini failed -- reject rather than fail-open
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
