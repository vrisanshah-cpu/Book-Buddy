"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FeedbackSurveyLauncher } from "@/components/feedback/FeedbackSurveyLauncher";

const links = [
  { href: "/kids/home", label: "Home", emoji: "🏠" },
  { href: "/kids/shelf", label: "Shelf", emoji: "📚" },
  { href: "/kids/discover", label: "Discover", emoji: "🔎" },
  { href: "/kids/challenges", label: "Challenges", emoji: "🏆" },
  { href: "/kids/events", label: "Events", emoji: "🏅" },
  { href: "/kids/collection", label: "Cards", emoji: "🃏" },
  { href: "/kids/leaderboard", label: "Leaderboard", emoji: "🥇" },
  { href: "/kids/reading-game", label: "Game", emoji: "🎮" },
  { href: "/kids/booktok", label: "BookTok", emoji: "🎬" },
  { href: "/kids/book-club", label: "Clubs", emoji: "👥" },
  { href: "/kids/pip-chat", label: "Pip", emoji: "🦉" },
];

export function KidsNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-violet-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/kids/home" className="font-kids-display text-xl font-bold text-kids-purple">
          📚 Book Buddy
        </Link>
        <div className="hidden gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                pathname === l.href
                  ? "bg-kids-purple text-white"
                  : "text-slate-600 hover:bg-violet-50"
              }`}
            >
              {l.emoji} {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <FeedbackSurveyLauncher variant="kids" label="Feedback" />
          </div>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 md:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold ${
              pathname === l.href ? "bg-kids-purple text-white" : "bg-violet-50 text-slate-600"
            }`}
          >
            {l.emoji} {l.label}
          </Link>
        ))}
        <FeedbackSurveyLauncher variant="kids" label="Feedback" className="shrink-0 !py-1.5 !text-xs" />
      </div>
    </nav>
  );
}