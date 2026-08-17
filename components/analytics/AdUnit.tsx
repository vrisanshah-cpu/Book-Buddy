"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

/**
 * A real ad unit: loads the AdSense script once (dedup guard, since this
 * can mount on multiple pages across a session) and renders an actual
 * <ins class="adsbygoogle"> slot, then pushes it. Previously the app only
 * ever loaded the bare script with no slot markup anywhere — nothing to
 * review, and the one place it *was* mounted (the public marketing
 * landing page, app/page.tsx) is exactly the kind of thin/promotional
 * screen AdSense's "ads on screens without publisher-content" policy
 * flags. That mount has been removed; this component is now only used on
 * substantive, logged-in dashboard pages — see ADSENSE_ALLOWED_ROUTES
 * below for the exact list, which matches this component's original
 * design-intent comment (parent/teacher dashboards, book lists,
 * analytics, book clubs, classroom, challenges, events, progress) —
 * never Settings, Messages, auth screens, loading states, or anything
 * under the kids layout. Kids never see ads, full stop.
 *
 * data-ad-slot below is a placeholder — replace AD_SLOT_ID with a real
 * slot ID from AdSense (Ads -> By ad unit -> Display ad -> create -> copy
 * the numeric slot id) before this can actually serve anything. Until
 * then this renders an empty, non-functional (but policy-harmless) unit.
 */
const AD_SLOT_ID = "REPLACE_WITH_REAL_AD_SLOT_ID";

let scriptLoaded = false;

export function AdUnit({ className = "" }: { className?: string }) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    pushedRef.current = true;
    try {
      // @ts-expect-error - adsbygoogle is injected by the external script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Script not loaded yet or ad blocked — fine, just no ad this time.
    }
  }, []);

  return (
    <div className={className}>
      {!scriptLoaded && (
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7877782569997046"
          crossOrigin="anonymous"
          strategy="afterInteractive"
          onLoad={() => {
            scriptLoaded = true;
          }}
        />
      )}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-7877782569997046"
        data-ad-slot={AD_SLOT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
