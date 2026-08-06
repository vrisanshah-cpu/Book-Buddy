import Script from "next/script";

/**
 * Loads the AdSense script. Google's policy on "ads on screens without
 * publisher-content" means this must NEVER load at layout level (that
 * puts ads on every route, including Settings and Messages — thin,
 * navigational/behavioral screens Google explicitly disallows).
 *
 * Only mount this on individual pages that have substantive, unique
 * content: parent/teacher dashboards, book lists, analytics, book clubs,
 * classroom, challenges, events, progress. Never on Settings, Messages,
 * auth screens, loading states, or anything under the kids layout —
 * kids never see ads, full stop.
 */
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
