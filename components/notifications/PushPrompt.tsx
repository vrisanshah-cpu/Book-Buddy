"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

/**
 * Small dismissible banner asking permission to send reading-streak /
 * weekend-event push notifications. Renders nothing if push isn't
 * supported, NEXT_PUBLIC_VAPID_PUBLIC_KEY isn't configured, or the
 * browser has already recorded a permission decision — browsers never
 * re-prompt after "denied" anyway, so there'd be nothing useful to show.
 */
export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ) {
      return;
    }
    if (Notification.permission === "default") setVisible(true);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string) as BufferSource,
      });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-800 ring-1 ring-violet-200">
      <span>🔔 Want a reminder before your reading streak resets?</span>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={enable}
          className="min-h-[36px] rounded-lg bg-kids-purple px-3 font-semibold text-white"
        >
          {busy ? "…" : "Turn on"}
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="min-h-[36px] rounded-lg px-3 font-semibold text-violet-500"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
