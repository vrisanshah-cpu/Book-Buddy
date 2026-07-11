import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (parentProfile?.role !== "parent") {
    return NextResponse.json({ error: "Only parents can create child accounts" }, { status: 403 });
  }

  const body = await request.json();
  const { username, displayName, age, avatarUrl, parentId, password } = body;

  if (parentId !== user.id) {
    return NextResponse.json({ error: "Invalid parent" }, { status: 403 });
  }

  if (!username || !displayName) {
    return NextResponse.json({ error: "Username and display name required" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const cleanUsername = username.toLowerCase().replace(/\W/g, "");
  const childEmail = `${user.id}+${cleanUsername}@bookbuddy.local`;

  const admin = createAdminClient();

  const { data: existingUsername } = await admin
    .from("users")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (existingUsername) {
    return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
  }

  const { data: childAuth, error: createError } = await admin.auth.admin.createUser({
    email: childEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: "kid",
      display_name: displayName,
      username: cleanUsername,
      parent_managed: true,
    },
  });

  if (createError || !childAuth.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create child" },
      { status: 500 }
    );
  }

  const childId = childAuth.user.id;

  await admin.from("users").upsert({
    id: childId,
    email: childEmail,
    role: "kid",
    display_name: displayName,
    username: cleanUsername,
    age: age ?? null,
    avatar_url: avatarUrl ?? null,
  });

  const { error: linkError } = await admin.from("parent_child").insert({
    parent_id: user.id,
    child_id: childId,
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({
    childId,
    childEmail,
  });
}