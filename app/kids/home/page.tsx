import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { getLevel, xpProgressInLevel } from "@/lib/xp";
import { calculateStreak } from "@/lib/reading-stats";
import { resolveEquippedCharacter } from "@/lib/character";
import { Button } from "@/components/ui/Button";
import { JoinClassroomCard } from "@/components/kids/JoinClassroomCard";
import { ParentLinkCodeCard } from "@/components/kids/ParentLinkCodeCard";
import { InstitutionWelcomeBanner } from "@/components/kids/InstitutionWelcomeBanner";
import { ThemeWrapper } from "@/components/kids/ThemeWrapper";
import { EquippedSlots } from "@/components/kids/EquippedSlots";
import type { ThemeConfig } from "@/lib/ai-theme";
import { ArrowRight, BookOpen, Flame, Sparkles, Star } from "lucide-react";

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

  const { data: ownedBadgeRows } = await supabase
    .from("user_badges")
    .select("badge:badges(id, name, icon)")
    .eq("user_id", user.id);
  const { data: ownedTitleRows } = await supabase
    .from("user_titles")
    .select("title:titles(id, name)")
    .eq("user_id", user.id);

  type BadgeRef = { id: string; name: string; icon: string };
  type TitleRef = { id: string; name: string };

  const ownedBadges = ((ownedBadgeRows ?? []) as { badge: BadgeRef | BadgeRef[] | null }[])
    .map((r) => (Array.isArray(r.badge) ? r.badge[0] : r.badge))
    .filter((b): b is BadgeRef => Boolean(b));
  const ownedTitles = ((ownedTitleRows ?? []) as { title: TitleRef | TitleRef[] | null }[])
    .map((r) => (Array.isArray(r.title) ? r.title[0] : r.title))
    .filter((t): t is TitleRef => Boolean(t));

  const equippedBadge = ownedBadges.find((b) => b.id === profile?.equipped_badge_id) ?? null;
  const equippedTitle = ownedTitles.find((t) => t.id === profile?.equipped_title_id) ?? null;
  const activeTheme = (profile?.active_theme_config as ThemeConfig | null) ?? null;
  const characterEquipped = await resolveEquippedCharacter(supabase, user.id);

  const { data: currentBook } = await supabase
    .from("user_books")
    .select("progress_percent, book:books(id, title, author, cover_url)")
    .eq("user_id", user.id)
    .eq("status", "reading")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: parentLinks } = await supabase
    .from("parent_child")
    .select("parent_id")
    .eq("child_id", user.id)
    .limit(1);

  const hasParentLinked = (parentLinks ?? []).length > 0;

  let institution: {
    name: string;
    logo_url: string | null;
    welcome_message: string | null;
  } | null = null;

  if (profile?.institution_id) {
    const { data: institutionRow } = await supabase
      .from("institutions")
      .select("name, logo_url, welcome_message")
      .eq("id", profile.institution_id)
      .maybeSingle();
    institution = institutionRow ?? null;
  }

  const { data: activeChallenges } = await supabase
    .from("user_challenges")
    .select("progress, challenge:challenges(title, target_value, badge_icon)")
    .eq("user_id", user.id)
    .eq("completed", false)
    .limit(3);

  const exploreLinks = [
    { href: "/kids/discover", label: "Discover", emoji: "🔎" },
    { href: "/kids/rewards", label: "Daily Rewards", emoji: "🎁" },
    { href: "/kids/events", label: "Events", emoji: "🏅" },
    { href: "/kids/collection", label: "Cards", emoji: "🃏" },
    { href: "/kids/challenges", label: "Challenges", emoji: "🏆" },
    { href: "/kids/leaderboard", label: "Leaderboard", emoji: "🥇" },
    { href: "/kids/reading-game", label: "Reading Game", emoji: "🎮" },
  ];

  const socialLinks = [
    { href: "/kids/book-club", label: "Book Club", emoji: "👥" },
    { href: "/kids/booktok", label: "BookTok", emoji: "🎬" },
    { href: "/kids/buddy", label: "Buddy Reading", emoji: "🤝" },
    { href: "/kids/competitions", label: "Writing", emoji: "✍️" },
    { href: "/kids/pip-chat", label: "Pip", emoji: "🦉" },
  ];

  const shopLinks = [
    { href: "/kids/character", label: "My Character", emoji: "🧑‍🎨" },
    { href: "/kids/shop", label: "Shop", emoji: "🛍️" },
    { href: "/kids/trades", label: "Trades", emoji: "🔄" },
  ];

  const activityGroups = [
    { label: "Play & grow", description: "Challenges, rewards, and new books", links: exploreLinks, tone: "bg-amber-50 border-amber-100" },
    { label: "Read together", description: "Clubs, friends, writing, and Pip", links: socialLinks, tone: "bg-teal-50 border-teal-100" },
    { label: "Make it yours", description: "Character gear, shop, and trades", links: shopLinks, tone: "bg-violet-50 border-violet-100" },
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
    <div className="pb-12">
      <ThemeWrapper theme={activeTheme}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[.14em] opacity-75">Your reading basecamp</p>
            <h1 className="mt-2 font-kids-display text-3xl font-semibold sm:text-4xl">
              Hey, {profile?.display_name ?? "Reader"}! 👋
            </h1>
            <p className="mt-2 max-w-xl text-base font-semibold opacity-90 sm:text-lg">
              {streak > 0
                ? `You’re on a ${streak}-day streak. Keep your story going.`
                : "A few pages today is all it takes to start a streak."}
            </p>
          </div>
          <EquippedSlots
            characterEquipped={characterEquipped}
            ownedBadges={ownedBadges}
            ownedTitles={ownedTitles}
            equippedBadge={equippedBadge}
            equippedTitle={equippedTitle}
          />
        </div>
        <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
          <DashboardStat icon={<Star className="h-4 w-4 fill-current" />} label={`Level ${level}`} value={title} />
          <DashboardStat icon={<Sparkles className="h-4 w-4" />} label="Total XP" value={xp.toLocaleString()} />
          <DashboardStat icon={<Flame className="h-4 w-4" />} label="Reading streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
        </div>
        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-white/30"
          role="progressbar"
          aria-label={`Level ${level} progress`}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-kids-yellow transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </ThemeWrapper>

      {institution && (
        <InstitutionWelcomeBanner
          name={institution.name}
          logoUrl={institution.logo_url}
          welcomeMessage={institution.welcome_message}
        />
      )}

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-violet-600">Your next step</p><h2 className="mt-1 font-kids-display text-2xl font-semibold text-slate-950">Continue your story</h2></div><Link href="/kids/shelf" className="hidden text-sm font-extrabold text-violet-700 hover:underline sm:block">View shelf</Link></div>
        {book ? (
          <Link
            href="/kids/shelf"
            className="group mt-4 flex min-h-44 gap-5 rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_45px_-25px_rgba(15,23,42,.65)] transition hover:-translate-y-1 hover:shadow-xl sm:p-6"
          >
            {book.cover_url && (
              <div className="relative h-32 w-20 shrink-0 overflow-hidden rounded-xl shadow-lg sm:h-36 sm:w-24">
                <Image src={book.cover_url} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            {!book.cover_url && <div className="grid h-32 w-20 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-4xl shadow-lg sm:h-36 sm:w-24">📕</div>}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <span className="w-fit rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-200">Reading now</span>
              <p className="mt-3 truncate font-kids-display text-xl font-semibold sm:text-2xl">{book.title}</p>
              <p className="mt-1 text-sm text-slate-300">{book.author}</p>
              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-label={`Reading progress for ${book.title}`}
                aria-valuenow={currentBook?.progress_percent ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-amber-300"
                  style={{ width: `${currentBook?.progress_percent ?? 0}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-300"><span>{currentBook?.progress_percent ?? 0}% finished</span><span className="inline-flex items-center gap-1 text-white">Keep reading <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div>
            </div>
          </Link>
        ) : (
          <div className="mt-4 rounded-[1.75rem] border-2 border-dashed border-violet-200 bg-white p-8 text-center text-slate-600 sm:p-10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-700"><BookOpen className="h-7 w-7" /></span>
            <p className="mt-4 font-kids-display text-xl font-semibold text-slate-950">What will you read next?</p>
            <p className="mt-1">Add a book and your adventure will show up here.</p>
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
                  <div
                    className="mt-2 h-2 rounded-full bg-violet-100"
                    role="progressbar"
                    aria-label={`${ch.title} progress`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full bg-kids-purple" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <JoinClassroomCard />
      {!hasParentLinked && <ParentLinkCodeCard />}

      <section className="mt-10">
        <p className="text-xs font-extrabold uppercase tracking-[.14em] text-violet-600">Pick what sounds fun</p>
        <h2 className="mt-1 font-kids-display text-2xl font-semibold text-slate-950">Choose your next adventure</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {activityGroups.map((group) => (
            <div key={group.label} className={`rounded-[1.5rem] border p-4 ${group.tone}`}>
              <h3 className="font-kids-display text-xl font-semibold text-slate-950">{group.label}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{group.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="group flex min-h-14 items-center gap-3 rounded-xl bg-white px-3 py-2 font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-violet-700 hover:shadow-md">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-xl" aria-hidden="true">{link.emoji}</span>
                    <span className="min-w-0 truncate">{link.label}</span>
                    <ArrowRight className="ml-auto hidden h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 sm:block" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DashboardStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex items-center gap-1.5 text-xs font-bold opacity-80">{icon}<span>{label}</span></div>
      <p className="mt-1 truncate font-kids-display text-base font-semibold sm:text-lg">{value}</p>
    </div>
  );
}
