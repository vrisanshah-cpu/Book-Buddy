import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Flame,
  Heart,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { FeedbackSurveyLauncher } from "@/components/feedback/FeedbackSurveyLauncher";

const FEATURES = [
  { icon: BookOpen, tone: "bg-amber-100 text-amber-800", title: "A reading routine that sticks", body: "Kids always know what to do next: pick up their book, log a session, and celebrate the win." },
  { icon: Sparkles, tone: "bg-violet-100 text-violet-700", title: "Motivation without the pressure", body: "Gentle streaks, collectible rewards, and challenges turn progress into something they can see and feel." },
  { icon: BarChart3, tone: "bg-teal-100 text-teal-800", title: "The useful bits for grown-ups", body: "Parents and teachers get clear reading trends and helpful signals—not another dashboard to babysit." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfaf6] font-kids text-slate-950">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 text-xl shadow-[0_7px_0_#4c1d95] transition-transform group-hover:-translate-y-0.5" aria-hidden="true">📚</span>
          <span className="font-kids-display text-xl font-semibold tracking-tight">Book Buddy</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-4">
          <Link href="#how-it-works" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 sm:block">How it works</Link>
          <Link href="/auth/login" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 sm:px-4">Log in</Link>
          <Link href="/auth/register" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 sm:px-5">Start free</Link>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-24">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.16em] text-violet-700 shadow-sm">
              <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Made for curious readers, ages 5–12
            </div>
            <h1 className="mt-7 max-w-3xl font-kids-display text-[3.35rem] font-semibold leading-[.98] tracking-[-.035em] sm:text-7xl lg:text-[5.15rem]">One more chapter feels like a win.</h1>
            <p className="mt-7 max-w-xl text-lg font-semibold leading-8 text-slate-600 sm:text-xl">Book Buddy helps kids build a reading habit through small goals, joyful rewards, and a friendly guide named Pip.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/register" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-7 text-base font-extrabold text-white shadow-[0_7px_0_#4c1d95] transition hover:-translate-y-0.5 hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300">Start your reading adventure <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
              <Link href="#how-it-works" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-7 text-base font-extrabold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300">See how it works</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-teal-600" />Free to start</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-teal-600" />No ads for kids</span>
              <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-4 w-4 text-teal-600" />Grown-up visibility</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none" aria-label="Preview of the Book Buddy reading dashboard">
            <div className="absolute -left-24 top-5 h-56 w-56 rounded-full bg-amber-200/70 blur-3xl" />
            <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-violet-200/70 blur-3xl" />
            <div className="relative rotate-1 rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_35px_90px_-35px_rgba(46,16,101,.45)] backdrop-blur sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-xs font-extrabold uppercase tracking-widest text-violet-600">Today&apos;s quest</p><p className="mt-1 font-kids-display text-xl font-semibold">Read for 20 minutes</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-2xl" aria-hidden="true">🦉</div></div>
              <div className="mt-5 rounded-[1.5rem] bg-[#242038] p-5 text-white sm:p-6">
                <div className="flex gap-4"><div className="grid h-28 w-20 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-4xl shadow-lg" aria-hidden="true">🐉</div><div className="min-w-0 flex-1"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-200">Reading now</span><h2 className="mt-3 truncate font-kids-display text-xl font-semibold">The Dragon&apos;s Library</h2><p className="mt-1 text-sm text-slate-300">Chapter 7 of 12</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[58%] rounded-full bg-amber-300" /></div><div className="mt-2 flex justify-between text-xs font-bold text-slate-300"><span>58% finished</span><span>+20 XP</span></div></div></div>
                <div className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-white font-extrabold text-slate-950">Continue reading <ArrowRight className="ml-2 h-4 w-4" /></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3"><Stat icon={<Flame className="h-5 w-5 text-orange-600" />} value="6 days" label="streak" /><Stat icon={<Star className="h-5 w-5 fill-amber-400 text-amber-400" />} value="1,240" label="XP earned" /><Stat icon={<BookOpen className="h-5 w-5 text-teal-600" />} value="8" label="books read" /></div>
            </div>
            <div className="landing-float absolute -left-5 top-24 hidden -rotate-6 rounded-2xl bg-amber-300 px-4 py-3 font-kids-display font-semibold text-amber-950 shadow-xl sm:block">🔥 New streak!</div>
            <div className="landing-float absolute -right-4 bottom-16 hidden rotate-3 rounded-2xl bg-teal-500 px-4 py-3 font-kids-display font-semibold text-white shadow-xl sm:block" style={{ animationDelay: "1.1s" }}>+20 XP ⭐</div>
          </div>
        </section>

        <section id="how-it-works" className="bg-slate-950 px-5 py-20 text-white sm:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl"><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-sm font-extrabold uppercase tracking-[.18em] text-amber-300">Built around the habit</p><h2 className="mt-3 max-w-lg font-kids-display text-4xl font-semibold leading-tight sm:text-5xl">Less hunting around. More reading.</h2></div><p className="max-w-xl text-lg leading-8 text-slate-300 lg:justify-self-end">A calm home base keeps the current book and next action obvious. Everything else is organized by purpose, so kids can explore without getting lost.</p></div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">{FEATURES.map((feature) => <article key={feature.title} className="rounded-[1.75rem] border border-white/10 bg-white/[.06] p-6 sm:p-7"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${feature.tone}`}><feature.icon className="h-6 w-6" /></span><h3 className="mt-6 font-kids-display text-2xl font-semibold">{feature.title}</h3><p className="mt-3 leading-7 text-slate-300">{feature.body}</p></article>)}</div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2"><AudienceCard icon={<Users className="h-7 w-7" />} eyebrow="For families" title="Cheer the effort, not just the finish." body="See what they’re reading, notice their rhythm, and celebrate consistency with a quick weekly view." bullets={["Reading minutes and streaks", "Current books and progress", "Private, linked child profiles"]} color="amber" /><AudienceCard icon={<MessageCircle className="h-7 w-7" />} eyebrow="For classrooms" title="Give every reader a clear next step." body="Set challenges, share book lists, and spot who could use a nudge without adding more busywork." bullets={["Class and student progress", "Purposeful reading challenges", "Moderated sharing spaces"]} color="violet" /></div></section>

        <section className="px-5 pb-20 sm:px-8 lg:pb-24"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 overflow-hidden rounded-[2rem] bg-violet-600 p-8 text-white shadow-[0_20px_70px_-30px_rgba(91,33,182,.65)] sm:p-12 lg:flex-row lg:items-center"><div><p className="text-sm font-extrabold uppercase tracking-[.18em] text-violet-200">Your next chapter starts here</p><h2 className="mt-3 max-w-2xl font-kids-display text-4xl font-semibold leading-tight">Make reading the best part of their day.</h2></div><Link href="/auth/register" className="group inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-7 font-extrabold text-violet-700 shadow-[0_7px_0_#ddd6fe] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300">Start free <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></Link></div></section>
      </main>

      <footer className="border-t border-violet-100 py-8 text-center text-sm text-slate-500"><p className="mb-2">Book Buddy · No ads on any kid-facing page · Built for classrooms and living rooms</p><FeedbackSurveyLauncher variant="link" label="Send beta feedback" /></footer>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-1.5">{icon}<span className="text-sm font-extrabold text-slate-900 sm:text-base">{value}</span></div><p className="mt-2 text-xs font-bold text-slate-500">{label}</p></div>;
}

function AudienceCard({ icon, eyebrow, title, body, bullets, color }: { icon: React.ReactNode; eyebrow: string; title: string; body: string; bullets: string[]; color: "amber" | "violet" }) {
  const tone = color === "amber" ? "bg-amber-100 text-amber-800" : "bg-violet-100 text-violet-700";
  return <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-8"><div className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>{icon}</div><p className="mt-6 text-xs font-extrabold uppercase tracking-[.16em] text-slate-500">{eyebrow}</p><h2 className="mt-2 font-kids-display text-3xl font-semibold">{title}</h2><p className="mt-3 leading-7 text-slate-600">{body}</p><ul className="mt-6 space-y-3">{bullets.map((bullet) => <li key={bullet} className="flex items-center gap-2.5 font-bold text-slate-700"><Check className="h-5 w-5 text-teal-600" />{bullet}</li>)}</ul></article>;
}
