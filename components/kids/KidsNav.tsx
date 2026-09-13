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
  { href: "/kids/rewards", label: "Rewards", emoji: "🎁" },
];

// Only account-y utility links live in the nav's "More" menu now — every
// feature/game/social link moved onto the home dashboard as tiles
// (app/kids/home/page.tsx) instead, since 17 links crammed into one
// toolbar (5 primary + 12 in a dropdown, ALL 17 on mobile) was the
// actual complaint. Nothing was removed, just relocated to where a
// dashboard tile fits better than a nav item.
const moreLinks = [
  { href: "/kids/messages", label: "Messages", emoji: "💬" },
  { href: "/kids/profile", label: "Profile", emoji: "🧑" },
  { href: "/kids/settings", label: "Settings", emoji: "⚙️" },
];

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
    <nav aria-label="Kid navigation" className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#fbfaf6]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/kids/home" className="flex shrink-0 items-center gap-2 rounded-xl font-kids-display text-lg font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 sm:text-xl">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-base shadow-[0_4px_0_#4c1d95]">📚</span> Book Buddy
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          {primaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm font-extrabold transition ${
                pathname === l.href ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-950"
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
              className={`relative flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm font-extrabold transition ${
                isInMore ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-950"
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
                className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200"
              >
                {moreLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    role="menuitem"
                    aria-current={pathname === l.href ? "page" : undefined}
                    className={`flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${
                      pathname === l.href ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-violet-50"
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
            className="flex min-h-[44px] items-center rounded-xl px-2 text-sm font-bold text-slate-500 hover:bg-white hover:text-slate-950"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur-xl md:hidden">
        {primaryLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={pathname === l.href ? "page" : undefined}
            className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-xl px-1 text-[11px] font-extrabold ${
              pathname === l.href ? "bg-violet-100 text-violet-800" : "text-slate-500"
            }`}
          >
            <span className="text-lg" aria-hidden="true">{l.emoji}</span><span>{l.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} aria-controls="kids-mobile-more-menu" className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-xl px-1 text-[11px] font-extrabold ${isInMore ? "bg-violet-100 text-violet-800" : "text-slate-500"}`}><span className="text-lg">•••</span><span>More</span>{unreadCount > 0 && <span className="absolute right-2 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
        {moreOpen && <div id="kids-mobile-more-menu" className="absolute bottom-full right-3 mb-3 w-52 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-slate-200">{moreLinks.map((l) => <Link key={l.href} href={l.href} className="flex min-h-12 items-center justify-between rounded-xl px-3 font-bold text-slate-700 hover:bg-violet-50"><span>{l.emoji} {l.label}</span>{l.href === "/kids/messages" && unreadCount > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</Link>)}<FeedbackSurveyLauncher variant="kids" label="Send feedback" className="mt-1 w-full" /></div>}
      </div>
    </nav>
  );
}
