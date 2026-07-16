import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FeedbackSurveySection } from "@/components/feedback/FeedbackSurveySection";
import { FeedbackSurveyLauncher } from "@/components/feedback/FeedbackSurveyLauncher";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-100 via-white to-teal-50 font-kids">
      <GoogleAdsense />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-kids-display text-2xl font-bold text-kids-purple">
          📚 Book Buddy
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <FeedbackSurveyLauncher variant="link" label="Feedback" />
          <Link href="/auth/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/auth/register">
            <Button variant="kids">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="font-kids-display text-5xl font-bold text-slate-900 md:text-6xl">
          Read more.
          <br />
          <span className="text-kids-purple">Have more fun.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Book Buddy is a safe reading companion for kids ages 5–12 — with Pip
          your AI buddy, challenges, book clubs, and dashboards for parents and
          teachers.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/auth/register">
            <Button variant="kids" className="px-8 py-3 text-base">
              Create free account
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="secondary" className="px-8 py-3 text-base">
              I already have an account
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { emoji: "🦉", title: "Meet Pip", desc: "Your friendly AI reading buddy" },
            { emoji: "🏆", title: "Challenges", desc: "Earn badges and level up" },
            { emoji: "👨‍👩‍👧", title: "Family & Class", desc: "Parents and teachers stay in the loop" },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl bg-white p-6 shadow-md"
            >
              <div className="text-4xl">{card.emoji}</div>
              <h3 className="mt-3 font-bold text-slate-900">{card.title}</h3>
              <p className="mt-1 text-slate-600">{card.desc}</p>
            </div>
          ))}
        </div>

        <section className="mt-24 rounded-3xl border border-violet-100 bg-white/80 p-8 shadow-lg backdrop-blur sm:p-12">
          <FeedbackSurveySection
            title="Testing Book Buddy?"
            subtitle="We’re in beta and your feedback matters. Share what you love, what’s confusing, and what you want next."
          />
          <p className="mt-6 text-center text-sm text-slate-500">
            Prefer a full page?{" "}
            <Link href="/feedback" className="font-semibold text-kids-purple hover:underline">
              Open the survey
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t border-violet-100 py-8 text-center text-sm text-slate-500">
        <FeedbackSurveyLauncher variant="link" label="Send beta feedback" />
      </footer>
    </div>
  );
}