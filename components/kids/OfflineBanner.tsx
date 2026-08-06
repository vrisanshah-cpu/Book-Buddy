"use client";

import { useEffect, useRef, useState } from "react";
import { flushReadingLogQueue, getQueueCount, onQueueChange } from "@/lib/offline-queue";

type Status = "hidden" | "offline" | "syncing" | "synced";

/**
 * Small, friendly banner shown above the kid nav whenever there's an
 * offline reading log queued or being synced. Stays out of the way
 * (hidden) the rest of the time.
 */
export function OfflineBanner() {
  const [status, setStatus] = useState<Status>("hidden");
  const [count, setCount] = useState(0);
  const hadQueuedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function refreshFromOnlineState(queued: number) {
      if (cancelled) return;
      if (queued > 0) hadQueuedRef.current = true;
      if (!navigator.onLine && queued > 0) {
        setStatus("offline");
      } else if (navigator.onLine && queued > 0) {
        setStatus("syncing");
      } else if (hadQueuedRef.current) {
        setStatus("synced");
        hadQueuedRef.current = false;
        setTimeout(() => !cancelled && setStatus("hidden"), 2500);
      } else {
        setStatus("hidden");
      }
      setCount(queued);
    }

    getQueueCount().then(refreshFromOnlineState);
    const unsubscribe = onQueueChange(refreshFromOnlineState);

    async function handleOnline() {
      const { remaining } = await flushReadingLogQueue();
      refreshFromOnlineState(remaining);
    }
    function handleOffline() {
      getQueueCount().then(refreshFromOnlineState);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Fallback for browsers/devices where the "online" event doesn't
    // reliably fire (e.g. some mobile webviews) — cheap periodic check.
    const interval = setInterval(() => {
      if (navigator.onLine) handleOnline();
    }, 30000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (status === "hidden") return null;

  const config: Record<Exclude<Status, "hidden">, { emoji: string; text: string; className: string }> = {
    offline: {
      emoji: "📴",
      text: count === 1 ? "Saved offline — will sync when you're back online" : `${count} reading logs saved offline — will sync when you're back online`,
      className: "bg-amber-50 text-amber-800 ring-amber-200",
    },
    syncing: {
      emoji: "🔄",
      text: count === 1 ? "Syncing 1 saved reading log…" : `Syncing ${count} saved reading logs…`,
      className: "bg-violet-50 text-violet-800 ring-violet-200",
    },
    synced: {
      emoji: "✅",
      text: "All synced!",
      className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    },
  };

  const { emoji, text, className } = config[status];

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold ring-1 ${className}`} role="status">
      <span aria-hidden="true">{emoji}</span>
      <span>{text}</span>
    </div>
  );
}
