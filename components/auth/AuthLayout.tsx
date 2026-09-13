import Link from "next/link";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbfaf6] font-kids">
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-200/60 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-violet-200/70 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-12 sm:px-6">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-600 text-xl shadow-[0_6px_0_#4c1d95]">📚</span>
          <span className="font-kids-display text-2xl font-semibold text-slate-950">Book Buddy</span>
        </Link>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_-35px_rgba(46,16,101,.35)] sm:p-9">
          <h1 className="font-kids-display text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          {subtitle && (
            <p className="mt-2 font-medium leading-6 text-slate-600">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
