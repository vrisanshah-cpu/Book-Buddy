import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: xpAwarded, error } = await supabase.rpc("claim_daily_spin", { p_user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (xpAwarded === null) return NextResponse.json({ error: "Already spun today — come back tomorrow!" }, { status: 409 });

  return NextResponse.json({ xpAwarded });
}
