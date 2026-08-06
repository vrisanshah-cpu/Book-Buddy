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

  // This route is invoked by three separate Vercel Cron entries (see
  // vercel.json), each once a day or less -- required on the Hobby plan,
  // which rejects any schedule that would fire more than once per day.
  // Each block below is gated to only do real work on its own entry's
  // exact UTC day+hour, so the three schedules never overlap:
  //   - streak warnings:      daily,        20:00 UTC  ("0 20 * * *")
  //   - weekend event starts: Fridays only, 23:00 UTC  ("0 23 * * 5")
  //   - weekend event ends:   Sundays only, 23:00 UTC  ("0 23 * * 0")
  // This replaced an hourly poll for events starting/ending "within the
  // next hour" -- unnecessary, since weekend events always start at
  // Saturday 00:00 UTC and end at Sunday 23:59:59 UTC (see
  // getUpcomingWeekendWindow in lib/weekend-events.ts), so the exact
  // moment to remind at is knowable in advance rather than polled for.
  const now = new Date();
  const currentHourUtc = now.getUTCHours();
  const currentDayUtc = now.getUTCDay(); // 0 = Sunday ... 6 = Saturday

  // ---- Daily streak-loss warnings ----
  const isStreakWarningRun = currentHourUtc === 20;

  if (isStreakWarningRun) {
    const todayKey = now.toISOString().split("T")[0];
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

  // ---- Weekend event start reminder (Fridays, ~1hr before Saturday 00:00 UTC start) ----
  const isEventStartRun = currentDayUtc === 5 && currentHourUtc === 23;
  // ---- Weekend event end reminder (Sundays, ~1hr before Sunday 23:59:59 UTC end) ----
  const isEventEndRun = currentDayUtc === 0 && currentHourUtc === 23;

  if (isEventStartRun || isEventEndRun) {
    const status = isEventStartRun ? "upcoming" : "active";
    const { data: events } = await admin
      .from("weekend_events")
      .select("id, title")
      .eq("status", status);

    const payload = (ev: { id: string; title: string }) =>
      isEventStartRun
        ? { title: `🎉 ${ev.title} starts soon!`, body: "The weekend event begins within the hour — get ready!", url: `/kids/events/${ev.id}` }
        : { title: `⏰ ${ev.title} ends soon!`, body: "Less than an hour left — log your last books to lock in your rank!", url: `/kids/events/${ev.id}` };

    for (const ev of events ?? []) {
      for (const kid of kidList) {
        await notifyKid(admin, kid, payload(ev));
        results.eventReminders++;
      }
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
