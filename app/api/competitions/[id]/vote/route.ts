import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId } = await request.json();
  if (!submissionId) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });

  const { error } = await supabase.rpc("cast_submission_vote", { p_submission_id: submissionId });

  if (error) {
    // Includes: own story, submission not found, or already voted this
    // competition (unique constraint on submission_votes).
    const message = error.message.includes("duplicate key") ? "You already voted in this competition" : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
