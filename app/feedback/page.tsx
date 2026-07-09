import Link from "next/link";
import { FeedbackSurveySection } from "@/components/feedback/FeedbackSurveySection";

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-teal-50 font-kids">
      <header className="border-b border-violet-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-kids-display text-lg font-bold text-kids-purple"
          >
            📚 Book Buddy
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto px-4 py-10 sm:px-6 sm:py-14">
        <FeedbackSurveySection tall />
      </main>
    </div>
  );
}
