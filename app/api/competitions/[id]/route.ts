import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: competition } = await supabase
    .from("writing_competitions")
    .select("id, title, prompt, prizes, starts_at, ends_at, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!competition) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: submissions } = await supabase
    .from("writing_submissions")
    .select(
      "id, title, content, ai_feedback, community_votes, is_winner, created_at, author:users!author_id(id, display_name, equipped_title:titles!equipped_title_id(name))"
    )
    .eq("competition_id", params.id)
    .order("community_votes", { ascending: false });

  const submissionIds = (submissions ?? []).map((s) => s.id);
  const { data: comments } =
    submissionIds.length > 0
      ? await supabase
          .from("submission_comments")
          .select("id, submission_id, comment_text, created_at, author:users!author_id(id, display_name)")
          .in("submission_id", submissionIds)
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: true })
      : { data: [] };

  const { data: myVote } = await supabase
    .from("submission_votes")
    .select("submission_id")
    .eq("competition_id", params.id)
    .eq("voter_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    competition,
    submissions: submissions ?? [],
    comments: comments ?? [],
    myVoteSubmissionId: myVote?.submission_id ?? null,
  });
}
