import Link from "next/link";
import { ShieldCheck, BarChart3, MessagesSquare, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeedbackSurveySection } from "@/components/feedback/FeedbackSurveySection";
import { FeedbackSurveyLauncher } from "@/components/feedback/FeedbackSurveyLauncher";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

const BOOK_SPINES = [
  { color: "#7C3AED", height: 118, width: 34 },
  { color: "#14B8A6", height: 96, width: 30 },
  { color: "#F472B6", height: 132, width: 36 },
  { color: "#FBBF24", height: 104, width: 28 },
  { color: "#7C3AED", height: 90, width: 32 },
  { color: "#14B8A6", height: 122, width: 34 },
];

const POPULAR_PICKS = [
  { title: "Wonder", author: "R.J. Palacio", color: "#7C3AED" },
  { title: "Percy Jackson", author: "Rick Riordan", color: "#14B8A6" },
  { title: "The One and Only Ivan", author: "Katherine Applegate", color: "#F472B6" },
  { title: "Diary of a Wimpy Kid", author: "Jeff Kinney", color: "#FBBF24" },
];

const KID_HIGHLIGHTS = [
  { emoji: "🦉", title: "Pip, their reading buddy", desc: "An AI companion who knows the book they're on and chats about it — never off-topic, never bored." },
  { emoji: "🎯", title: "Quizzes for any book", desc: "Search a title, get a quick quiz written just for that story. No generic trivia." },
  { emoji: "🏅", title: "Badges, streaks, XP", desc: "Every finished book, every quiz, every streak adds up — and shows up on the class leaderboard." },
  { emoji: "🎬", title: "BookTok for readers", desc: "A moderated space to rave about books with classmates — not the internet at large." },
];

const GROWNUP_HIGHLIGHTS = [
  { icon: BarChart3, title: "Real dashboards", desc: "See minutes read, books finished, and quiz scores for every kid or student, updated live." },
  { icon: ShieldCheck, title: "No ads on kid pages", desc: "Ever. Ads only ever appear on parent and teacher pages — kids never see one." },
  { icon: BookOpenCheck, title: "Assign with intention", desc: "Build reading lists, assign challenges, and set them loose on books that fit." },
  { icon: MessagesSquare, title: "Every post, moderated", desc: "Book clubs and BookTok are classroom-scoped and reviewable — nothing slips past you." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-landing-paper font-kids text-landing-ink">
      <GoogleAdsense />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
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

      {/* ---------------------------------------------------------------- HERO */}
      <main>
        <section className="relative overflow-hidden">
          <Sparkle top="12%" left="8%" delay="0s" />
          <Sparkle top="22%" left="88%" delay="1.1s" />
          <Sparkle top="68%" left="4%" delay="2.2s" />
          <Sparkle top="8%" left="52%" delay="0.6s" />

          <div className="relative mx-auto max-w-4xl px-6 pb-8 pt-14 text-center sm:pt-20">
            <span className="inline-block rounded-full bg-violet-100 px-3 py-1 font-teacher text-xs font-semibold uppercase tracking-wide text-kids-purple">
              For kids 5–12 · Free to start
            </span>

            <h1 className="mt-5 font-kids-display text-5xl font-bold leading-[1.08] text-landing-ink md:text-6xl">
              Turn story time into
              <br />
              <span className="text-kids-purple">their favorite time.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
              Book Buddy turns reading into a game your kid actually wants to play —
              quizzes, badges, a reading buddy named Pip, and dashboards that keep you
              in the loop.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/auth/register">
                <Button
                  variant="kids"
                  className="px-8 py-3 text-base transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Create free account
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  variant="secondary"
                  className="px-8 py-3 text-base transition hover:-translate-y-0.5"
                >
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>

          {/* Signature: the animated bookshelf */}
          <div className="mx-auto mt-6 max-w-3xl px-6 pb-16">
            <svg
              viewBox="0 0 640 210"
              className="mx-auto w-full max-w-2xl"
              role="img"
              aria-label="An illustrated bookshelf with colorful books and Pip the owl perched on the end"
            >
              {/* floating badges */}
              <g className="landing-badge" style={{ animationDelay: "1.0s" }}>
                <circle cx="120" cy="34" r="17" fill="#FBBF24" />
                <text x="120" y="40" textAnchor="middle" fontSize="18">
                  🏆
                </text>
              </g>
              <g className="landing-badge" style={{ animationDelay: "1.2s" }}>
                <circle cx="330" cy="20" r="15" fill="#F472B6" />
                <text x="330" y="26" textAnchor="middle" fontSize="15">
                  🔥
                </text>
              </g>
              <g className="landing-badge" style={{ animationDelay: "1.4s" }}>
                <circle cx="450" cy="40" r="15" fill="#14B8A6" />
                <text x="450" y="46" textAnchor="middle" fontSize="15">
                  ⭐
                </text>
              </g>

              {/* the shelf plank */}
              <rect x="20" y="176" width="600" height="14" rx="7" fill="#5C3A21" />
              <rect x="20" y="176" width="600" height="5" rx="2.5" fill="#7A4F2E" />

              {/* book spines, staggered pop-in */}
              {BOOK_SPINES.map((book, i) => {
                const x = 46 + i * 46;
                const y = 176 - book.height;
                return (
                  <g
                    key={i}
                    className="landing-book"
                    style={{ animationDelay: `${0.15 + i * 0.1}s` }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={book.width}
                      height={book.height}
                      rx="5"
                      fill={book.color}
                    />
                    <rect
                      x={x + 6}
                      y={y + 14}
                      width={book.width - 12}
                      height="4"
                      rx="2"
                      fill="rgba(255,255,255,0.55)"
                    />
                  </g>
                );
              })}

              {/* Pip, perched at the end of the shelf */}
              <g className="landing-pip" style={{ transformOrigin: "560px 150px" }}>
                <ellipse cx="560" cy="150" rx="30" ry="26" fill="#7C3AED" />
                <circle cx="549" cy="142" r="10" fill="white" />
                <circle cx="571" cy="142" r="10" fill="white" />
                <circle cx="549" cy="143" r="4.5" fill="#241748" />
                <circle cx="571" cy="143" r="4.5" fill="#241748" />
                <polygon points="560,150 554,158 566,158" fill="#FBBF24" />
                <path d="M534 152 Q522 148 528 168" stroke="#7C3AED" strokeWidth="8" fill="none" strokeLinecap="round" />
                <path d="M586 152 Q598 148 592 168" stroke="#7C3AED" strokeWidth="8" fill="none" strokeLinecap="round" />
              </g>
            </svg>
          </div>
        </section>

        {/* ---------------------------------------------------------- HOW IT WORKS */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center font-kids-display text-3xl font-bold text-landing-ink">
            Three steps. Every book.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", title: "Pick a book", desc: "Search real titles or grab one your teacher or parent assigned." },
              { n: "02", title: "Read & play", desc: "Log minutes, then take a quick quiz Pip writes just for that book." },
              { n: "03", title: "Earn the shelf", desc: "XP, badges, and streaks stack up — and land on the class leaderboard." },
            ].map((step) => (
              <div key={step.n} className="relative rounded-2xl bg-white p-6 shadow-md">
                <span className="font-teacher text-sm font-bold tracking-wide text-kids-purple/50">
                  {step.n}
                </span>
                <h3 className="mt-2 font-kids-display text-xl font-bold text-landing-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- KID / GROWN-UP SPLIT */}
        <section className="bg-kids-bg py-16">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-2">
            <div>
              <span className="font-teacher text-xs font-semibold uppercase tracking-wide text-kids-purple">
                What your kid sees
              </span>
              <h3 className="mt-2 font-kids-display text-2xl font-bold text-landing-ink">
                A world built to pull them back in
              </h3>
              <div className="mt-6 space-y-5">
                {KID_HIGHLIGHTS.map((h) => (
                  <div key={h.title} className="flex gap-3">
                    <span className="text-2xl">{h.emoji}</span>
                    <div>
                      <p className="font-bold text-landing-ink">{h.title}</p>
                      <p className="text-sm text-slate-600">{h.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="font-teacher text-xs font-semibold uppercase tracking-wide text-slate-500">
                What you see
              </span>
              <h3 className="mt-2 font-kids-display text-2xl font-bold text-landing-ink">
                Full visibility, zero extra work
              </h3>
              <div className="mt-6 space-y-5">
                {GROWNUP_HIGHLIGHTS.map((h) => (
                  <div key={h.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                      <h.icon className="h-5 w-5 text-kids-purple" strokeWidth={2} />
                    </span>
                    <div>
                      <p className="font-teacher font-bold text-landing-ink">{h.title}</p>
                      <p className="text-sm text-slate-600">{h.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- POPULAR PICKS */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-kids-display text-3xl font-bold text-landing-ink">
            Books they already know
          </h2>
          <p className="mt-2 max-w-xl text-slate-600">
            A few favorites kids search for on Book Buddy — every quiz is written
            fresh for whatever title they pick, not just these.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR_PICKS.map((b) => (
              <div key={b.title} className="rounded-2xl bg-white p-5 shadow-md">
                <div
                  className="h-3 w-10 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                <p className="mt-4 font-kids-display font-bold text-landing-ink">
                  {b.title}
                </p>
                <p className="text-sm text-slate-500">{b.author}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- FEEDBACK */}
        <section className="mx-auto max-w-5xl px-6 pb-16">
          <div className="rounded-3xl border border-violet-100 bg-white/80 p-8 shadow-lg backdrop-blur sm:p-12">
            <FeedbackSurveySection
              title="Testing Book Buddy?"
              subtitle="We're in beta and your feedback matters. Share what you love, what's confusing, and what you want next."
            />
            <p className="mt-6 text-center text-sm text-slate-500">
              Prefer a full page?{" "}
              <Link href="/feedback" className="font-semibold text-kids-purple hover:underline">
                Open the survey
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-violet-100 py-8 text-center text-sm text-slate-500">
        <p className="mb-2">Book Buddy · No ads on any kid-facing page · Built for classrooms and living rooms</p>
        <FeedbackSurveyLauncher variant="link" label="Send beta feedback" />
      </footer>
    </div>
  );
}

function Sparkle({ top, left, delay }: { top: string; left: string; delay: string }) {
  return (
    <span
      className="landing-sparkle pointer-events-none absolute text-xl"
      style={{ top, left, animationDelay: delay }}
      aria-hidden="true"
    >
      ✦
    </span>
  );
}
