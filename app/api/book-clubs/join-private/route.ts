import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteCode } = await request.json();
  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  const { data: club } = await supabase
    .from("book_clubs")
    .select("id, name")
    .eq("invite_code", String(inviteCode).toUpperCase().trim())
    .maybeSingle();

  if (!club) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const { error } = await supabase.from("book_club_members").upsert({
    club_id: club.id,
    user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ club });
}