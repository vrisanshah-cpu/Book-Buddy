"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackSurveyModal } from "./FeedbackSurveyModal";

type Variant = "kids" | "parent" | "teacher" | "ghost" | "link";

interface FeedbackSurveyLauncherProps {
  variant?: Variant;
  label?: string;
  className?: string;
}

const styles: Record<Variant, string> = {
  kids: "rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-kids-purple hover:bg-violet-100",
  parent: "rounded-lg px-3 py-2 text-sm font-medium text-parent-primary hover:bg-blue-50",
  teacher: "rounded-lg px-3 py-2 text-sm font-medium text-teacher-primary hover:bg-indigo-50",
  ghost: "text-sm text-slate-500 hover:text-slate-800",
  link: "text-sm font-medium text-kids-purple underline-offset-2 hover:underline",
};

export function FeedbackSurveyLauncher({
  variant = "ghost",
  label = "Feedback",
  className = "",
}: FeedbackSurveyLauncherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 transition ${styles[variant]} ${className}`}
      >
        <MessageSquarePlus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        {label}
      </button>
      <FeedbackSurveyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
