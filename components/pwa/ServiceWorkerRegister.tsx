"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js on mount. Renders nothing — this only exists to
 * run a client-side effect from the (server) root layout. Safe to no-op
 * on browsers without service worker support (e.g. some older embedded
 * webviews).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability/offline shell is a progressive enhancement — a
      // failed registration should never block the app from working.
    });
  }, []);

  return null;
}
