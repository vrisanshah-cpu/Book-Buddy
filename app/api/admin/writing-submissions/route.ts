import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };

  return { error: null };
}

// GET /api/admin/writing-submissions?competitionId=<uuid> — the Entry
// Reader's data source. Uses the admin client (bypasses RLS) purely so
// admins can also read submissions on 'draft' competitions, which the
// regular writing_submissions_select policy (024) hides from everyone —
// admins should be able to preview entries before a contest goes live.
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const competitionId = url.searchParams.get("competitionId");
  if (!competitionId) return NextResponse.json({ error: "Missing competitionId" }, { status: 400 });

  const admin = createAdminClient();

  const { data: competition } = await admin
    .from("writing_competitions")
    .select("id, title, status")
    .eq("id", competitionId)
    .maybeSingle();
  if (!competition) return NextResponse.json({ error: "Competition not found" }, { status: 404 });

  const { data: submissions, error: fetchError } = await admin
    .from("writing_submissions")
    .select(
      "id, title, content, ai_feedback, community_votes, is_winner, stage, score, admin_feedback, created_at, author:users!author_id(id, display_name, email)"
    )
    .eq("competition_id", competitionId)
    .order("score", { ascending: false, nullsFirst: false })
    .order("community_votes", { ascending: false });

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  return NextResponse.json({ competition, submissions: submissions ?? [] });
}
