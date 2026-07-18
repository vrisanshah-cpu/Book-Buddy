"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { searchOpenLibrary, type OpenLibraryBook } from "@/lib/open-library";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { BookStatus } from "@/lib/types";

interface AuthorCardReveal {
  dropped: boolean;
  isNewAuthor: boolean;
  boosted: boolean;
  serialCode?: string;
  quantity?: number;
  card: {
    author_name: string;
    fun_fact: string;
    artifact_name: string | null;
    artifact_description: string | null;
    icon: string;
    rarity: "common" | "rare" | "legendary";
  };
}

interface ShelfBook {
  id: string;
  status: BookStatus;
  progress_percent: number;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
}

const TABS: { key: BookStatus; label: string }[] = [
  { key: "reading", label: "Currently Reading" },
  { key: "finished", label: "Finished" },
  { key: "want_to_read", label: "Want to Read" },
];

export function ShelfClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState<BookStatus>("reading");
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OpenLibraryBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [logBook, setLogBook] = useState<ShelfBook | null>(null);
  const [minutes, setMinutes] = useState("");
  const [pages, setPages] = useState("");
  const [progress, setProgress] = useState("");
  const [markFinished, setMarkFinished] = useState(false);
  const [cardReveal, setCardReveal] = useState<AuthorCardReveal | null>(null);
  const [packOpened, setPackOpened] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_books")
      .select("id, status, progress_percent, book:books(id, title, author, cover_url)")
      .eq("user_id", userId)
      .eq("status", tab)
      .order("started_at", { ascending: false });
    setBooks((data as unknown as ShelfBook[]) ?? []);
    setLoading(false);
  }, [supabase, userId, tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchOpenLibrary(searchQuery);
    setSearchResults(results);
    setSearching(false);
  }

async function addBook(book: OpenLibraryBook, status: BookStatus) {
    const res = await fetch("/api/books/shelf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...book, status }),
    });
    if (res.ok) {
      setShowAdd(false);
      setSearchResults([]);
      setSearchQuery("");
      if (status === tab) load();
      else setTab(status);
    } else {
      const data = await res.json().catch(() => ({}));
      alert("Couldn't add that book: " + (data.error ?? res.status));
    }
  }

  function openPack() {
    if (!cardReveal || packOpened) return;
    setPackOpened(true);
    if (cardReveal.card.rarity === "legendary") {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ["#FBBF24", "#F59E0B", "#FFFFFF"] });
    } else if (cardReveal.card.rarity === "rare") {
      confetti({ particleCount: 140, spread: 85, origin: { y: 0.5 }, colors: ["#38BDF8", "#0EA5E9", "#FFFFFF"] });
    } else {
      confetti({ particleCount: 90, spread: 65, origin: { y: 0.5 } });
    }
  }

  async function logSession() {
    if (!logBook) return;
    const res = await fetch("/api/reading/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: logBook.book.id,
        userBookId: logBook.id,
        minutesRead: minutes,
        pagesRead: pages,
        progressPercent: progress || logBook.progress_percent,
        markFinished,
      }),
    });
    const data = await res.json();
    if (markFinished || data.finishedBook) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
    if (data.authorCard?.dropped) {
      setPackOpened(false);
      setCardReveal(data.authorCard as AuthorCardReveal);
    }
    setLogBook(null);
    setMinutes("");
    setPages("");
    setProgress("");
    setMarkFinished(false);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-kids-display text-3xl font-bold text-slate-900">My Shelf</h1>
        <Button variant="kids" onClick={() => setShowAdd(true)}>
          + Add a Book
        </Button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "bg-kids-purple text-white" : "bg-white text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : books.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white p-8 text-center text-slate-500">
          No books here yet. Add one!
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {books.map((ub) => (
            <div key={ub.id} className="flex gap-4 rounded-2xl bg-white p-4 shadow-md">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-violet-100">
                {ub.book.cover_url ? (
                  <Image
                    src={ub.book.cover_url}
                    alt={ub.book.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">📖</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 line-clamp-2">{ub.book.title}</h3>
                <p className="text-sm text-slate-500">{ub.book.author}</p>
                {tab === "reading" && (
                  <>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100">
                      <div
                        className="h-full bg-kids-teal"
                        style={{ width: `${ub.progress_percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{ub.progress_percent}% read</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="kids"
                        className="!py-1.5 !text-xs"
                        onClick={() => {
                          setLogBook(ub);
                          setProgress(String(ub.progress_percent));
                          setMarkFinished(false);
                        }}
                      >
                        Log session
                      </Button>
                      <Button
                        variant="secondary"
                        className="!py-1.5 !text-xs"
                        onClick={() => {
                          setLogBook(ub);
                          setProgress("100");
                          setMarkFinished(true);
                        }}
                      >
                        Finish book
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <h2 className="text-xl font-bold">Add a book</h2>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Search title or author…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="kids" onClick={handleSearch} disabled={searching}>
                {searching ? "…" : "Search"}
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {searchResults.map((b, i) => (
                <div
                  key={`${b.title}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{b.title}</p>
                    <p className="text-sm text-slate-500">{b.author}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="kids"
                      className="!px-2 !py-1 !text-xs"
                      onClick={() => addBook(b, "reading")}
                    >
                      Reading
                    </Button>
                    <Button
                      variant="secondary"
                      className="!px-2 !py-1 !text-xs"
                      onClick={() => addBook(b, "want_to_read")}
                    >
                      Want
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" fullWidth className="mt-4" onClick={() => setShowAdd(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {logBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-xl font-bold">Log reading</h2>
            <p className="text-sm text-slate-600">{logBook.book.title}</p>
            <div className="mt-4 space-y-3">
              <Input
                label="Minutes read"
                type="number"
                min={0}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
              <Input
                label="Pages read"
                type="number"
                min={0}
                value={pages}
                onChange={(e) => setPages(e.target.value)}
              />
              <Input
                label="Progress %"
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={markFinished}
                  onChange={(e) => setMarkFinished(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                I finished this book!
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setLogBook(null)}>
                Cancel
              </Button>
              <Button variant="kids" fullWidth onClick={logSession}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {cardReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-flip-scene w-full max-w-sm">
            <div className={`card-flip-card ${packOpened ? "is-flipped" : ""}`}>
              {/* FRONT FACE: sealed pack -- tap/click to open */}
              <button
                type="button"
                onClick={openPack}
                aria-label="Open your new card"
                className={`card-flip-face relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center shadow-2xl ${
                  cardReveal.card.rarity === "legendary"
                    ? "card-pack-idle-legendary bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600"
                    : cardReveal.card.rarity === "rare"
                    ? "card-pack-idle bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600"
                    : "card-pack-idle bg-gradient-to-br from-violet-400 via-kids-purple to-indigo-600"
                }`}
              >
                <span className="card-pack-sparkle absolute left-6 top-8 text-2xl">✨</span>
                <span
                  className="card-pack-sparkle absolute right-8 top-16 text-xl"
                  style={{ animationDelay: "0.4s" }}
                >
                  ✨
                </span>
                <span
                  className="card-pack-sparkle absolute bottom-10 left-10 text-lg"
                  style={{ animationDelay: "0.8s" }}
                >
                  ✨
                </span>
                <span className="text-6xl">🎁</span>
                <p className="font-kids-display text-xl font-bold text-white drop-shadow">
                  {cardReveal.isNewAuthor
                    ? "New author card!"
                    : cardReveal.boosted
                    ? "Event bonus card!"
                    : "You found a card!"}
                </p>
                <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-slate-800">
                  Tap to open
                </span>
              </button>

              {/* BACK FACE: revealed card -- only meaningfully visible once flipped */}
              <div
                className={`card-flip-face card-flip-face-back flex flex-col rounded-2xl bg-white p-6 text-center shadow-2xl ring-4 ${
                  cardReveal.card.rarity === "legendary"
                    ? "ring-amber-300"
                    : cardReveal.card.rarity === "rare"
                    ? "ring-sky-300"
                    : "ring-slate-200"
                }`}
              >
                <span className="text-6xl">{cardReveal.card.icon}</span>
                <p className="mt-2 font-kids-display text-xl font-bold text-slate-900">
                  {cardReveal.card.author_name}
                </p>
                <span
                  className={`mt-1 inline-block w-fit self-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    cardReveal.card.rarity === "legendary"
                      ? "bg-amber-100 text-amber-700"
                      : cardReveal.card.rarity === "rare"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {cardReveal.card.rarity}
                </span>
                <p className="mt-3 text-sm text-slate-600">{cardReveal.card.fun_fact}</p>
                {cardReveal.card.artifact_name && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">🏺 {cardReveal.card.artifact_name}:</span>{" "}
                    {cardReveal.card.artifact_description}
                  </p>
                )}
                {cardReveal.serialCode && (
                  <p className="mt-3 font-mono text-xs text-slate-400">{cardReveal.serialCode}</p>
                )}
                {cardReveal.quantity && cardReveal.quantity > 1 && (
                  <p className="mt-1 text-xs text-slate-400">You now have {cardReveal.quantity} of this card.</p>
                )}
                <Button
                  variant="kids"
                  fullWidth
                  onClick={() => {
                    setCardReveal(null);
                    setPackOpened(false);
                  }}
                  className="mt-5"
                >
                  Add to binder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}