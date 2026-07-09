"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FeedbackSurveyLauncher } from "@/components/feedback/FeedbackSurveyLauncher";

const links = [
  { href: "/teacher/classroom", label: "Classroom" },
  { href: "/teacher/progress", label: "Progress" },
  { href: "/teacher/book-lists", label: "Book Lists" },
  { href: "/teacher/challenges", label: "Challenges" },
  { href: "/teacher/book-clubs", label: "Book Clubs" },
];

export function TeacherNav() {
  const pathname = usePathname();
  const router = useRouter();

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
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === l.href
                ? "bg-indigo-50 text-teacher-primary"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {l.label}
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
