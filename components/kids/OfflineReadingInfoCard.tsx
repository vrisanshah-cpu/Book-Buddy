"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Offline reading logging has existed since the PWA phase (public/sw.js,
 * lib/offline-queue.ts, <OfflineBanner /> in the kids layout) but had no
 * discoverable home -- the banner only ever appears while something is
 * actually queued, so there was no way to find out the feature exists
 * ahead of time, or to install the app for real offline use. This card
 * is that home: explains what it does, shows live connection status,
 * and offers the install prompt when the browser supports it.
 */
export function OfflineReadingInfoCard() {
  const [isOnline, setIsOnline] = useState(true);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  async function handleInstall() {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallPromptEvent(null);
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">
          {isOnline ? "🟢" : "📴"}
        </span>
        <h2 className="font-kids-display text-lg font-bold text-slate-900">Offline Reading</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        No internet? No problem. Book Buddy saves your reading log on your
        device and syncs it automatically the next time you&apos;re online — you
        never lose progress. You&apos;re currently{" "}
        <strong>{isOnline ? "online" : "offline (saving locally)"}</strong>.
      </p>
      {installed ? (
        <p className="mt-3 text-sm font-semibold text-emerald-600">✓ Installed as an app on this device</p>
      ) : installPromptEvent ? (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-3 min-h-[44px] rounded-xl bg-kids-purple px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          Install Book Buddy on this device
        </button>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          Tip: use your browser&apos;s &ldquo;Add to Home Screen&rdquo; option to install Book
          Buddy and read offline anytime.
        </p>
      )}
    </section>
  );
}
