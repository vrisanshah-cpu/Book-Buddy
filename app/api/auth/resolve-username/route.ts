import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { username } = await request.json();

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const cleanUsername = String(username).toLowerCase().replace(/\W/g, "");

  const { data: child } = await admin
    .from("users")
    .select("email")
    .eq("username", cleanUsername)
    .eq("role", "kid")
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "No account found with that username" }, { status: 404 });
  }

  return NextResponse.json({ email: child.email });
}