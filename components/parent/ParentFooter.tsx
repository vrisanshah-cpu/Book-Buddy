const KOFI_USERNAME = process.env.NEXT_PUBLIC_KOFI_USERNAME;

// Parent-only footer: same reasoning as AdUnit's placement — ads and
// donation asks stay out of app/kids and app/teacher.
export function ParentFooter() {
  if (!KOFI_USERNAME) return null;

  return (
    <footer className="mt-8 flex flex-col items-center gap-4 border-t border-slate-200 pt-6 pb-4">
      <a
        href={`https://ko-fi.com/${KOFI_USERNAME}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#72a4f2] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        ☕ Support Book Buddy
      </a>
    </footer>
  );
}
