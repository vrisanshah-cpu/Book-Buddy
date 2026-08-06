import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateStreak } from "@/lib/reading-stats";
import { sendPushToUser } from "@/lib/push";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface KidRow {
  id: string;
  display_name: string;
  email: string | null;
}

async function notifyKid(
  admin: ReturnType<typeof createAdminClient>,
  kid: KidRow,
  payload: { title: string; body: string; url: string }
) {
  const pushSent = await sendPushToUser(admin, kid.id, payload);
  let emailSent = false;
  if (kid.email) {
    const result = await sendEmail({
      to: kid.email,
      subject: payload.title,
      html: `<p>Hi ${kid.display_name},</p><p>${payload.body}</p><p><a href="https://bookbuddy.app${payload.url}">Open Book Buddy</a></p>`,
    });
    emailSent = result.sent;
  }
  return { pushSent, emailSent };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results = { streakWarnings: 0, eventReminders: 0 };

  const { data: kids } = await admin.from("users").select("id, display_name, email").eq("role", "kid");
  const kidList = (kids ?? []) as KidRow[];

  // ---- Daily streak-loss warnings ----
  // This route runs hourly (see vercel.json) so the event-reminder window
  // below doesn't miss anything, but a streak warning should only go out
  // once a day — so it's gated to a single hour (20:00 UTC, i.e. evening
  // for most of the US) rather than every run.
  const currentHourUtc = new Date().getUTCHours();
  const isStreakWarningHour = currentHourUtc === 20;

  if (isStreakWarningHour) {
    const todayKey = new Date().toISOString().split("T")[0];
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoKey = tenDaysAgo.toISOString().split("T")[0];

    for (const kid of kidList) {
      const { data: sessions } = await admin
        .from("reading_sessions")
        .select("date, minutes_read")
        .eq("user_id", kid.id)
        .gte("date", tenDaysAgoKey);

      const rows = sessions ?? [];
      const streak = calculateStreak(rows);
      const loggedToday = rows.some((s) => s.date.split("T")[0] === todayKey);

      if (streak > 0 && !loggedToday) {
        await notifyKid(admin, kid, {
          title: "🔥 Don't lose your streak!",
          body: `You have a ${streak}-day reading streak. Log a little reading today to keep it going!`,
          url: "/kids/shelf",
        });
        results.streakWarnings++;
      }
    }
  }

  // ---- Weekend event start/end reminders (next hour) ----
  const nowIso = new Date().toISOString();
  const inOneHourIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { data: startingEvents } = await admin
    .from("weekend_events")
    .select("id, title")
    .eq("status", "upcoming")
    .gte("starts_at", nowIso)
    .lte("starts_at", inOneHourIso);

  const { data: endingEvents } = await admin
    .from("weekend_events")
    .select("id, title")
    .eq("status", "active")
    .gte("ends_at", nowIso)
    .lte("ends_at", inOneHourIso);

  const eventReminders = [
    ...(startingEvents ?? []).map((e) => ({ ...e, kind: "starting" as const })),
    ...(endingEvents ?? []).map((e) => ({ ...e, kind: "ending" as const })),
  ];

  for (const ev of eventReminders) {
    const payload =
      ev.kind === "starting"
        ? { title: `🎉 ${ev.title} starts soon!`, body: "The weekend event begins within the hour — get ready!", url: `/kids/events/${ev.id}` }
        : { title: `⏰ ${ev.title} ends soon!`, body: "Less than an hour left — log your last books to lock in your rank!", url: `/kids/events/${ev.id}` };

    for (const kid of kidList) {
      await notifyKid(admin, kid, payload);
      results.eventReminders++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
