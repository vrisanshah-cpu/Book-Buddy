import Script from "next/script";

/** Only ever used in the parent and teacher layouts, plus the public landing
 * page for AdSense site verification — never the kids layout.
 * Uses beforeInteractive so the script tag is present in the server-rendered
 * HTML itself; afterInteractive only injects it client-side after hydration,
 * which Google's verification crawler (a plain HTML fetch) never sees. */
export function GoogleAdsense() {
  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7877782569997046"
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
}