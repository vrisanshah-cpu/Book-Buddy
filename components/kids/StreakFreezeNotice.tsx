"use client";

import { useState } from "react";

export function StreakFreezeNotice({ applied }: { applied: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (!applied || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-200">
      <span>🧊 We used one of your streak freezes to cover yesterday — your streak is safe!</span>
      <button type="button" onClick={() => setDismissed(true)} className="shrink-0 font-semibold text-sky-500 hover:text-sky-700">
        Got it
      </button>
    </div>
  );
}
