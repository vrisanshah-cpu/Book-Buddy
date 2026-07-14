import Script from "next/script";

/** Only ever used in the parent and teacher layouts — never the kids layout. */
export function GoogleAdsense() {
  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7877782569997046"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}