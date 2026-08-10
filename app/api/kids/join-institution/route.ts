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

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Enter a code first" }, { status: 400 });
  }

  // institutions_select (migration 026) lets any authenticated user read
  // institutions, so this lookup works on the caller's own session client
  // — no admin client needed. Case-insensitive match against the code.
  const { data: institution } = await supabase
    .from("institutions")
    .select("id, name, type, logo_url, welcome_message")
    .ilike("code", code)
    .maybeSingle();

  if (!institution) {
    return NextResponse.json(
      { error: "That code doesn't match any school or company we know about" },
      { status: 404 }
    );
  }

  // Self-write: users_update_own (migration 001) already permits this,
  // so this also runs on the caller's own session client. Overwrites any
  // previously linked institution — switching schools/companies is fine.
  const { error: updateError } = await supabase
    .from("users")
    .update({ institution_id: institution.id })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    institution: {
      name: institution.name,
      type: institution.type,
      logo_url: institution.logo_url,
      welcome_message: institution.welcome_message,
    },
  });
}
