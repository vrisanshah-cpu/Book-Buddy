// Book Buddy service worker.
//
// Scope: PWA installability + offline access to the public shell (landing
// page + static PWA assets) only. It deliberately does NOT cache or
// intercept anything under /api/, any POST/PUT/DELETE request, or any
// authenticated kid/parent/teacher page — those stay live-network-only so
// a kid never sees stale or another session's cached data. The offline
// reading-log queue is handled separately in lib/offline-queue.ts via
// IndexedDB, not by this worker.
//
// Bump CACHE_NAME whenever SHELL_ASSETS changes so old caches get cleared
// on the next activate.
const CACHE_NAME = "book-buddy-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {
        // Best-effort precache — a single failed asset (e.g. first deploy
        // before icons exist) shouldn't block install.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return; // never touch POST /api/reading/log etc.

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase/Gemini calls pass straight through
  if (url.pathname.startsWith("/api/")) return;

  const isNavigation = request.mode === "navigate";
  const isStaticShellAsset = url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json";

  if (!isNavigation && !isStaticShellAsset) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseCopy = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, responseCopy))
          .catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (isNavigation) {
          const offlineFallback = await caches.match("/offline.html");
          if (offlineFallback) return offlineFallback;
        }
        return Response.error();
      })
  );
});

// Phase J: streak/event push nudges, sent server-side from
// app/api/cron/send-nudges (lib/push.ts). Payload is JSON:
// { title, body, url }. `url` is where notificationclick should land —
// defaults to the kid dashboard if omitted.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Book Buddy", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Book Buddy", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/kids/home" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/kids/home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
