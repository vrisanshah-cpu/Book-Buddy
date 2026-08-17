// Lightweight Ko-fi CTA — plain styled link, no third-party script/iframe.
// Placed in the parent sidebar only: donation prompts don't belong in
// kids/ or teacher/ surfaces.
const KOFI_USERNAME = process.env.NEXT_PUBLIC_KOFI_USERNAME;

export function KofiButton({ className = "" }: { className?: string }) {
  if (!KOFI_USERNAME) return null; // silently omit if not configured

  return (
    <a
      href={`https://ko-fi.com/${KOFI_USERNAME}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 rounded-lg bg-[#00b9fe] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#00a3e0] ${className}`}
    >
      <span aria-hidden="true">☕</span>
      Support Book Buddy
    </a>
  );
}
