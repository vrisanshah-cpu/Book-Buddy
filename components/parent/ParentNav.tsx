"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FeedbackSurveyLauncher } from "@/components/feedback/FeedbackSurveyLauncher";

const links = [
  { href: "/parent/dashboard", label: "Dashboard" },
  { href: "/parent/books", label: "Books" },
  { href: "/parent/book-clubs", label: "Book Clubs" },
  { href: "/parent/settings", label: "Settings" },
];

export function ParentNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
      <Link href="/parent/dashboard" className="mb-8 text-lg font-bold text-parent-primary">
        📚 Book Buddy
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === l.href
                ? "bg-blue-50 text-parent-primary"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <FeedbackSurveyLauncher variant="parent" label="Beta feedback" className="mt-4" />
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
