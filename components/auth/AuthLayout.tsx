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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-teal-50">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-8 text-center">
          <span className="font-kids-display text-3xl font-bold text-kids-purple">
            📚 Book Buddy
          </span>
        </Link>
        <div className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-slate-600">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
