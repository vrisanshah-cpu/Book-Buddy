import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function syncCompetitionStatuses() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  await admin.from("writing_competitions").update({ status: "active" }).eq("status", "draft").lte("starts_at", nowIso);
  await admin.from("writing_competitions").update({ status: "judging" }).eq("status", "active").lte("ends_at", nowIso);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncCompetitionStatuses();

  const { data: competitions } = await supabase
    .from("writing_competitions")
    .select("id, title, prompt, prizes, starts_at, ends_at, status")
    .order("starts_at", { ascending: false });

  return NextResponse.json({ competitions: competitions ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { title, prompt, prizes, startsAt, endsAt } = await request.json();
  if (!title?.trim() || !prompt?.trim() || !startsAt || !endsAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (new Date(endsAt) <= new Date(startsAt)) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const status = new Date(startsAt) <= new Date() ? "active" : "draft";

  const { data: competition, error } = await supabase
    .from("writing_competitions")
    .insert({
      title: title.trim(),
      prompt: prompt.trim(),
      prizes: prizes ?? {},
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ competition });
}
