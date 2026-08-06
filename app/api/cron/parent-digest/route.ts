import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateStreak, sumMinutesInRange } from "@/lib/reading-stats";
import { callGemini, hasGeminiKey } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface ChildStats {
  displayName: string;
  minutesThisWeek: number;
  booksFinishedThisWeek: number;
  newBadges: string[];
  currentStreak: number;
}

const SYSTEM_PROMPT = `You write short, warm weekly reading-progress summaries for parents, one paragraph per child (2-3 sentences each). Be specific with the numbers given, encouraging, and never invent details not provided. No markdown, plain text only.`;

function buildFallbackDigestText(children: ChildStats[]): string {
  return children
    .map((c) => {
      const badgeNote = c.newBadges.length > 0 ? ` They also earned ${c.newBadges.length} new badge${c.newBadges.length === 1 ? "" : "s"}: ${c.newBadges.join(", ")}.` : "";
      const streakNote = c.currentStreak > 0 ? ` Current reading streak: ${c.currentStreak} day${c.currentStreak === 1 ? "" : "s"}.` : "";
      return `${c.displayName} read for ${c.minutesThisWeek} minutes and finished ${c.booksFinishedThisWeek} book${c.booksFinishedThisWeek === 1 ? "" : "s"} this week.${badgeNote}${streakNote}`;
    })
    .join("\n\n");
}

async function buildDigestText(children: ChildStats[]): Promise<string> {
  if (!hasGeminiKey()) return buildFallbackDigestText(children);

  const prompt = children
    .map(
      (c) =>
        `${c.displayName}: ${c.minutesThisWeek} minutes read, ${c.booksFinishedThisWeek} books finished, ${c.newBadges.length} new badges (${c.newBadges.join(", ") || "none"}), ${c.currentStreak}-day current streak.`
    )
    .join("\n");

  try {
    return await callGemini(SYSTEM_PROMPT, [{ role: "user", text: prompt }]);
  } catch {
    return buildFallbackDigestText(children);
  }
}

function digestHtml(parentName: string, summaryText: string): string {
  const paragraphs = summaryText
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `<p style="margin:0 0 12px;color:#334155;">${line}</p>`)
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h1 style="color:#7C3AED;font-size:20px;">This week in Book Buddy</h1>
      <p style="color:#334155;">Hi ${parentName},</p>
      ${paragraphs}
      <p style="margin-top:16px;"><a href="https://bookbuddy.app/parent/dashboard" style="color:#7C3AED;">Open your parent dashboard</a></p>
    </div>
  `.trim();
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let digestsSent = 0;

  const { data: parents } = await admin.from("users").select("id, display_name, email").eq("role", "parent").not("email", "is", null);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const parent of parents ?? []) {
    const { data: links } = await admin.from("parent_child").select("child_id").eq("parent_id", parent.id);
    const childIds = (links ?? []).map((l) => l.child_id as string);
    if (childIds.length === 0) continue;

    const childStats: ChildStats[] = [];

    for (const childId of childIds) {
      const { data: child } = await admin.from("users").select("display_name").eq("id", childId).single();
      if (!child) continue;

      const { data: sessions } = await admin
        .from("reading_sessions")
        .select("date, minutes_read")
        .eq("user_id", childId)
        .gte("date", weekAgo.toISOString().split("T")[0]);
      const sessionRows = sessions ?? [];

      const { count: booksFinishedThisWeek } = await admin
        .from("user_books")
        .select("id", { count: "exact", head: true })
        .eq("user_id", childId)
        .eq("status", "finished")
        .gte("finished_at", weekAgo.toISOString());

      const { data: badgeRows } = await admin
        .from("user_badges")
        .select("earned_at, badge:badges(name)")
        .eq("user_id", childId)
        .gte("earned_at", weekAgo.toISOString());

      type BadgeRow = { badge: { name: string } | { name: string }[] | null };
      const newBadges = ((badgeRows ?? []) as BadgeRow[])
        .map((b) => (Array.isArray(b.badge) ? b.badge[0]?.name : b.badge?.name))
        .filter((name): name is string => Boolean(name));

      childStats.push({
        displayName: child.display_name,
        minutesThisWeek: sumMinutesInRange(sessionRows, weekAgo, new Date()),
        booksFinishedThisWeek: booksFinishedThisWeek ?? 0,
        newBadges,
        currentStreak: calculateStreak(sessionRows),
      });
    }

    if (childStats.length === 0) continue;

    const summaryText = await buildDigestText(childStats);
    const result = await sendEmail({
      to: parent.email as string,
      subject: "Your weekly Book Buddy digest 📚",
      html: digestHtml(parent.display_name, summaryText),
    });

    if (result.sent) digestsSent++;
  }

  return NextResponse.json({ ok: true, digestsSent });
}
