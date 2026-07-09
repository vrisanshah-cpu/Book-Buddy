import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { getLevel, xpProgressInLevel } from "@/lib/xp";
import { calculateStreak } from "@/lib/reading-stats";
import { Button } from "@/components/ui/Button";
import { JoinClassroomCard } from "@/components/kids/JoinClassroomCard";

export default async function KidsHomePage() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const xp = profile?.xp ?? 0;
  const { level, title } = getLevel(xp);
  const progress = xpProgressInLevel(xp);

  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("date, minutes_read")
    .eq("user_id", user.id);

  const streak = calculateStreak(sessions ?? []);

  const { data: currentBook } = await supabase
    .from("user_books")
    .select("progress_percent, book:books(id, title, author, cover_url)")
    .eq("user_id", user.id)
    .eq("status", "reading")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: activeChallenges } = await supabase
    .from("user_challenges")
    .select("progress, challenge:challenges(title, target_value, badge_icon)")
    .eq("user_id", user.id)
    .eq("completed", false)
    .limit(3);

  const quickLinks = [
    { href: "/kids/shelf", label: "My Shelf", emoji: "📚" },
    { href: "/kids/challenges", label: "Challenges", emoji: "🏆" },
    { href: "/kids/reading-game", label: "Reading Game", emoji: "🎮" },
    { href: "/kids/book-club", label: "Book Club", emoji: "👥" },
    { href: "/kids/booktok", label: "BookTok", emoji: "🎬" },
  ];

  const bookData = Array.isArray(currentBook?.book)
    ? currentBook.book[0]
    : currentBook?.book;
  const book = (bookData ?? null) as {
    title: string;
    author: string;
    cover_url: string | null;
  } | null;

  return (
    <div>
      <div className="rounded-3xl bg-gradient-to-r from-kids-purple to-kids-teal p-6 text-white shadow-lg">
        <p className="text-lg opacity-90">Hey, {profile?.display_name ?? "Reader"}! 👋</p>
        <h1 className="mt-1 font-kids-display text-3xl font-bold">
          {streak > 0
            ? `You're on a ${streak}-day streak — amazing!`
            : "Start reading today to build your streak!"}
        </h1>
        <div className="mt-6 flex flex-wrap gap-6">
          <div>
            <p className="text-sm opacity-80">Level {level}</p>
            <p className="text-xl font-bold">{title}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">XP</p>
            <p className="text-xl font-bold">{xp}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Streak</p>
            <p className="text-xl font-bold">🔥 {streak} days</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-kids-yellow transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-kids-display text-xl font-bold text-slate-900">
          Continue Reading
        </h2>
        {book ? (
          <Link
            href="/kids/shelf"
            className="mt-3 flex gap-4 rounded-2xl bg-white p-5 shadow-md"
          >
            {book.cover_url && (
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg">
                <Image src={book.cover_url} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-slate-900">{book.title}</p>
              <p className="text-sm text-slate-500">{book.author}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100">
                <div
                  className="h-full bg-kids-teal"
                  style={{ width: `${currentBook?.progress_percent ?? 0}%` }}
                />
              </div>
            </div>
          </Link>
        ) : (
          <div className="mt-3 rounded-2xl border-2 border-dashed border-violet-200 bg-white p-8 text-center text-slate-500">
            <p>No book in progress yet.</p>
            <Link href="/kids/shelf" className="mt-3 inline-block">
              <Button variant="kids">Add a book to your shelf</Button>
            </Link>
          </div>
        )}
      </section>

      {(activeChallenges ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="font-kids-display text-xl font-bold">Active challenges</h2>
          <div className="mt-3 space-y-2">
            {activeChallenges?.map((uc) => {
              const challengeData = Array.isArray(uc.challenge) ? uc.challenge[0] : uc.challenge;
              const ch = challengeData as {
                title: string;
                target_value: number;
                badge_icon: string | null;
              };
              const pct = Math.min(
                100,
                Math.round(((uc.progress ?? 0) / ch.target_value) * 100)
              );
              return (
                <Link
                  key={ch.title}
                  href="/kids/challenges"
                  className="block rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span>{ch.badge_icon ?? "🏆"}</span>
                    <span className="font-semibold">{ch.title}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-violet-100">
                    <div className="h-full rounded-full bg-kids-purple" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <JoinClassroomCard />

      <section className="mt-8">
        <h2 className="font-kids-display text-xl font-bold text-slate-900">Quick links</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl bg-white p-4 shadow-md transition hover:shadow-lg"
            >
              <span className="text-2xl">{l.emoji}</span>
              <p className="mt-2 font-semibold text-slate-800">{l.label}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}