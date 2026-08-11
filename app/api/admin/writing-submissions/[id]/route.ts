import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STAGES = ["participant", "semifinalist", "finalist", "top_3"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { stage, score, adminFeedback } = (await request.json()) as {
    stage?: string;
    score?: number | null;
    adminFeedback?: string | null;
  };

  const update: Record<string, unknown> = {};
  if (stage !== undefined) {
    if (!VALID_STAGES.includes(stage)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    update.stage = stage;
  }
  if (score !== undefined) {
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
      return NextResponse.json({ error: "Score must be between 0 and 100" }, { status: 400 });
    }
    update.score = score;
  }
  if (adminFeedback !== undefined) {
    update.admin_feedback = adminFeedback?.trim() || null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: submission, error } = await admin
    .from("writing_submissions")
    .update(update)
    .eq("id", params.id)
    .select("id, stage, score, admin_feedback")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submission });
}
