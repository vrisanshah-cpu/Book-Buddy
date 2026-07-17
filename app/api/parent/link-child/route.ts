import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: parentProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (parentProfile?.role !== "parent") {
    return NextResponse.json({ error: "Only parents can link a child" }, { status: 403 });
  }

  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "A link code is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: child, error: findError } = await admin
    .from("users")
    .select("id, display_name, username, age, role")
    .eq("link_code", code.trim().toUpperCase())
    .eq("role", "kid")
    .maybeSingle();

  if (findError || !child) {
    return NextResponse.json({ error: "That code doesn't match any child profile" }, { status: 404 });
  }

  const { error: linkError } = await admin
    .from("parent_child")
    .upsert({ parent_id: user.id, child_id: child.id }, { onConflict: "parent_id,child_id" });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // One-time use — clear the code once it's been redeemed.
  await admin.from("users").update({ link_code: null }).eq("id", child.id);

  return NextResponse.json({
    childId: child.id,
    displayName: child.display_name,
    username: child.username,
    age: child.age,
  });
}