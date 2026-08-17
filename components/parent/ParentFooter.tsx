"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const ADSENSE_SLOT_FOOTER = process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER;
const KOFI_USERNAME = process.env.NEXT_PUBLIC_KOFI_USERNAME;

// Parent-only footer: same reasoning as KofiButton — ads and donation asks
// stay out of app/kids and app/teacher.
export function ParentFooter() {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !ADSENSE_SLOT_FOOTER) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("Book Buddy: AdSense push failed", err);
    }
    const timer = setTimeout(() => {
      const ins = slotRef.current?.querySelector("ins.adsbygoogle");
      if (ins && (ins as HTMLElement).clientHeight === 0 && slotRef.current) {
        slotRef.current.style.display = "none"; // ad-blocked or unfilled — collapse cleanly
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <footer className="mt-8 flex flex-col items-center gap-4 border-t border-slate-200 pt-6 pb-4">
      {ADSENSE_CLIENT_ID && ADSENSE_SLOT_FOOTER && (
        <div ref={slotRef} style={{ minHeight: 90, overflow: "hidden", width: "100%" }}>
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={ADSENSE_CLIENT_ID}
            data-ad-slot={ADSENSE_SLOT_FOOTER}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
      {KOFI_USERNAME && (
        <a
          href={`https://ko-fi.com/${KOFI_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#72a4f2] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          ☕ Support Book Buddy
        </a>
      )}
    </footer>
  );
}
