import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantCustomReward } from "@/lib/challenges";

interface Prize {
  xp?: number;
  badgeName?: string;
  badgeIcon?: string;
  titleName?: string;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { officialWinnerSubmissionId } = await request.json();
  if (!officialWinnerSubmissionId) {
    return NextResponse.json({ error: "Missing officialWinnerSubmissionId" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: competition } = await admin
    .from("writing_competitions")
    .select("id, prizes, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!competition) return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  if (competition.status === "completed") {
    return NextResponse.json({ error: "This competition is already judged" }, { status: 400 });
  }

  const { data: officialWinner } = await admin
    .from("writing_submissions")
    .select("id, author_id")
    .eq("id", officialWinnerSubmissionId)
    .eq("competition_id", params.id)
    .maybeSingle();
  if (!officialWinner) return NextResponse.json({ error: "That submission isn't part of this competition" }, { status: 400 });

  const { data: communityWinner } = await admin
    .from("writing_submissions")
    .select("id, author_id, community_votes")
    .eq("competition_id", params.id)
    .order("community_votes", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prizes = (competition.prizes ?? {}) as { official?: Prize; community?: Prize };

  await admin.from("writing_submissions").update({ is_winner: true }).eq("id", officialWinner.id);
  if (prizes.official) {
    await grantCustomReward(officialWinner.author_id, `writing_${competition.id}_official`, prizes.official);
  }

  if (communityWinner && communityWinner.community_votes > 0 && communityWinner.id !== officialWinner.id) {
    await admin.from("writing_submissions").update({ is_winner: true }).eq("id", communityWinner.id);
    if (prizes.community) {
      await grantCustomReward(communityWinner.author_id, `writing_${competition.id}_community`, prizes.community);
    }
  }

  await admin.from("writing_competitions").update({ status: "completed" }).eq("id", params.id);

  return NextResponse.json({ ok: true, officialWinnerId: officialWinner.id, communityWinnerId: communityWinner?.id ?? null });
}
