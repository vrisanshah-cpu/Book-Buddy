import Script from "next/script";

export const ADSENSE_CLIENT_ID = "ca-pub-7877782569997046";

/** Injected in root layout `<head>` on every page via Next.js App Router. */
export function AdSense() {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
}