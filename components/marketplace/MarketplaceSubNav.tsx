"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "", label: "Browse" },
  { path: "/sell", label: "Sell" },
];

const ACCENT: Record<"parent" | "teacher", string> = {
  parent: "border-parent-primary text-slate-900",
  teacher: "border-teacher-primary text-slate-900",
};

export function MarketplaceSubNav({ role }: { role: "parent" | "teacher" }) {
  const pathname = usePathname();
  const base = `/${role}/marketplace`;

  return (
    <div className="mb-6 flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        const active = tab.path === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              active ? ACCENT[role] : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
