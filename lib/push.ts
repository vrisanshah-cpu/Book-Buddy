import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export function hasPushKeys(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@bookbuddy.app",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Deep link opened on notification click — see notificationclick in public/sw.js. */
  url?: string;
}

interface RawSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

async function sendToSubscription(subscription: RawSubscription, payload: PushPayload): Promise<boolean> {
  if (!hasPushKeys()) return false;
  ensureConfigured();
  try {
    await webpush.sendNotification(subscription as webpush.PushSubscription, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends a push to every device a kid has subscribed on. Uses the admin
 * client — this runs from the send-nudges cron, not a user session — and
 * prunes subscriptions that fail (expired/revoked) so the table doesn't
 * accumulate dead endpoints.
 */
export async function sendPushToUser(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  if (!hasPushKeys()) return 0;

  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, keys").eq("user_id", userId);
  let sent = 0;

  for (const sub of subs ?? []) {
    const ok = await sendToSubscription({ endpoint: sub.endpoint, keys: sub.keys as RawSubscription["keys"] }, payload);
    if (ok) {
      sent++;
    } else {
      await admin.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }

  return sent;
}
