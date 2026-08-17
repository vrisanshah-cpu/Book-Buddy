import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/apply-referral
 *
 * Called as a follow-up right after supabase.auth.signUp() succeeds —
 * same pattern app/auth/register/page.tsx already uses for
 * /api/auth/create-child. Kept separate from the signup call itself
 * rather than threading a referral code through auth metadata, so this
 * doesn't touch the existing signup flow's error handling.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = (await request.json()) as { code?: string };
  if (!code?.trim()) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const { data: applied, error } = await supabase.rpc("apply_referral_code", {
    p_user_id: user.id,
    p_code: code.trim().toUpperCase(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!applied) return NextResponse.json({ error: "That referral code isn't valid, or was already used" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
