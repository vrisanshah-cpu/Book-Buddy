import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function randomCode(length = 8) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await request.json();
  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  // Only a parent already linked to this child may generate a code for them.
  const { data: existingLink } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", user.id)
    .eq("child_id", childId)
    .maybeSingle();

  if (!existingLink) {
    return NextResponse.json({ error: "Not linked to this child" }, { status: 403 });
  }

  const code = randomCode();
  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ link_code: code }).eq("id", childId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code });
}