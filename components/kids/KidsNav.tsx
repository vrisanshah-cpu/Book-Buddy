"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FeedbackSurveyLauncher } from "@/components/feedback/FeedbackSurveyLauncher";
import { useUnreadMessageCount } from "@/components/messaging/useUnreadMessageCount";

const primaryLinks = [
  { href: "/kids/home", label: "Home", emoji: "🏠" },
  { href: "/kids/shelf", label: "Shelf", emoji: "📚" },
  { href: "/kids/discover", label: "Discover", emoji: "🔎" },
  { href: "/kids/events", label: "Events", emoji: "🏅" },
  { href: "/kids/collection", label: "Cards", emoji: "🃏" },
];

const moreLinks = [
  { href: "/kids/challenges", label: "Challenges", emoji: "🏆" },
  { href: "/kids/leaderboard", label: "Leaderboard", emoji: "🥇" },
  { href: "/kids/reading-game", label: "Game", emoji: "🎮" },
  { href: "/kids/booktok", label: "BookTok", emoji: "🎬" },
  { href: "/kids/book-club", label: "Clubs", emoji: "👥" },
  { href: "/kids/pip-chat", label: "Pip", emoji: "🦉" },
  { href: "/kids/messages", label: "Messages", emoji: "💬" },
  { href: "/kids/settings", label: "Settings", emoji: "⚙️" },
];

const allLinks = [...primaryLinks, ...moreLinks];

export function KidsNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isInMore = moreLinks.some((l) => l.href === pathname);
  const unreadCount = useUnreadMessageCount();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <nav aria-label="Kid navigation" className="sticky top-0 z-20 border-b border-violet-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/kids/home" className="shrink-0 font-kids-display text-xl font-bold text-kids-purple">
          📚 Book Buddy
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          {primaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                pathname === l.href ? "bg-kids-purple text-white" : "text-slate-600 hover:bg-violet-50"
              }`}
            >
              {l.emoji} {l.label}
            </Link>
          ))}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={moreOpen}
              aria-controls="kids-more-menu"
              className={`relative flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isInMore ? "bg-kids-purple text-white" : "text-slate-600 hover:bg-violet-50"
              }`}
            >
              ⋯ More
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {moreOpen && (
              <div
                id="kids-more-menu"
                role="menu"
                className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-white p-2 shadow-lg ring-1 ring-violet-100"
              >
                {moreLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    role="menuitem"
                    aria-current={pathname === l.href ? "page" : undefined}
                    className={`flex min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${
                      pathname === l.href ? "bg-kids-purple text-white" : "text-slate-600 hover:bg-violet-50"
                    }`}
                  >
                    <span>
                      {l.emoji} {l.label}
                    </span>
                    {l.href === "/kids/messages" && unreadCount > 0 && (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden md:block">
            <FeedbackSurveyLauncher variant="kids" label="Feedback" />
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-[44px] items-center text-sm text-slate-500 hover:text-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 md:hidden">
        {allLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={pathname === l.href ? "page" : undefined}
            className={`relative flex min-h-[44px] shrink-0 items-center rounded-xl px-3 py-1.5 text-xs font-semibold ${
              pathname === l.href ? "bg-kids-purple text-white" : "bg-violet-50 text-slate-600"
            }`}
          >
            {l.emoji} {l.label}
            {l.href === "/kids/messages" && unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
        <FeedbackSurveyLauncher variant="kids" label="Feedback" className="shrink-0 !py-1.5 !text-xs" />
      </div>
    </nav>
  );
}
