// Offline queue for the reading-log endpoint (app/api/reading/log/route.ts).
//
// Why IndexedDB and not localStorage: the project rules rule out
// localStorage/sessionStorage, and IndexedDB survives larger payloads and
// concurrent tabs more safely. This file is client-only — every export
// guards on `typeof window`/`indexedDB` so it's safe to import from a
// "use client" component even during SSR/build.
//
// Consumers (e.g. ShelfClient.tsx) should:
//   1. Try the real POST first.
//   2. On a network failure (fetch throw) or when navigator.onLine is
//      false, call queueReadingLog(payload) instead of surfacing an error.
//   3. Not worry about flushing themselves — flushReadingLogQueue() is
//      called automatically by <OfflineBanner /> on the "online" event and
//      on a periodic fallback timer (see components/kids/OfflineBanner.tsx).

const DB_NAME = "book-buddy-offline";
const DB_VERSION = 1;
const STORE_NAME = "reading-log-queue";
const CHANGE_EVENT = "bb-offline-queue-changed";
const READING_LOG_ENDPOINT = "/api/reading/log";

export interface ReadingLogPayload {
  bookId: string;
  userBookId: string | null;
  minutesRead: number | string;
  pagesRead: number | string;
  progressPercent: number | string | null;
  markFinished: boolean;
}

export interface QueuedReadingLog {
  id: number;
  payload: ReadingLogPayload;
  queuedAt: string;
}

function isSupported() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isSupported()) {
      reject(new Error("IndexedDB not supported in this environment"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function emitChange() {
  const count = await getQueueCount().catch(() => 0);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<{ count: number }>(CHANGE_EVENT, { detail: { count } }));
  }
}

/** Queue a reading-log entry for later sync. Resolves once it's durably stored. */
export async function queueReadingLog(payload: ReadingLogPayload): Promise<void> {
  if (!isSupported()) return;
  await withStore("readwrite", (store) =>
    store.add({ payload, queuedAt: new Date().toISOString() } as Omit<QueuedReadingLog, "id">)
  );
  await emitChange();
}

export async function getQueuedReadingLogs(): Promise<QueuedReadingLog[]> {
  if (!isSupported()) return [];
  return withStore("readonly", (store) => store.getAll()) as Promise<QueuedReadingLog[]>;
}

export async function getQueueCount(): Promise<number> {
  if (!isSupported()) return 0;
  return withStore("readonly", (store) => store.count());
}

async function removeQueuedReadingLog(id: number): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

/**
 * Flushes queued reading logs to the API in the order they were queued.
 * Stops at the first failure (network error or non-ok response) so entries
 * stay in order and we don't hammer an endpoint that's still unreachable —
 * the next "online" event or periodic check will retry from there.
 */
export async function flushReadingLogQueue(): Promise<{ flushed: number; remaining: number }> {
  if (!isSupported() || typeof navigator !== "undefined" && !navigator.onLine) {
    return { flushed: 0, remaining: await getQueueCount() };
  }

  const entries = await getQueuedReadingLogs();
  let flushed = 0;

  for (const entry of entries) {
    try {
      const res = await fetch(READING_LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      if (!res.ok) break; // server rejected it or is down — stop, keep order
      await removeQueuedReadingLog(entry.id);
      flushed += 1;
    } catch {
      break; // still offline / network error — stop, retry later
    }
  }

  if (flushed > 0) await emitChange();
  return { flushed, remaining: await getQueueCount() };
}

/** Subscribe to queue-length changes (add, remove, flush). Returns an unsubscribe fn. */
export function onQueueChange(listener: (count: number) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => listener((e as CustomEvent<{ count: number }>).detail.count);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
