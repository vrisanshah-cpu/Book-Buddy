"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FeedbackSurveyLauncher } from "@/components/feedback/FeedbackSurveyLauncher";
import { useUnreadMessageCount } from "@/components/messaging/useUnreadMessageCount";

const links = [
  { href: "/teacher/classroom", label: "Classroom" },
  { href: "/teacher/progress", label: "Progress" },
  { href: "/teacher/analytics", label: "Analytics" },
  { href: "/teacher/events", label: "Events" },
  { href: "/teacher/book-lists", label: "Book Lists" },
  { href: "/teacher/challenges", label: "Challenges" },
  { href: "/teacher/book-clubs", label: "Book Clubs" },
  { href: "/teacher/messages", label: "Messages" },
  { href: "/teacher/settings", label: "Settings" },
];

export function TeacherNav() {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useUnreadMessageCount();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
      <Link href="/teacher/classroom" className="mb-8 text-lg font-bold text-teacher-primary">
        📚 Book Buddy
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === l.href
                ? "bg-indigo-50 text-teacher-primary"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {l.label}
            {l.href === "/teacher/messages" && unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <FeedbackSurveyLauncher variant="teacher" label="Beta feedback" className="mt-4" />
      <button
        type="button"
        onClick={signOut}
        className="mt-4 text-left text-sm text-slate-500 hover:text-slate-800"
      >
        Sign out
      </button>
    </aside>
  );
}
