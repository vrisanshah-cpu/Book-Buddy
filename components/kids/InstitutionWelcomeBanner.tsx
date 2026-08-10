"use client";

import { useState } from "react";
import Image from "next/image";

interface InstitutionWelcomeBannerProps {
  name: string;
  logoUrl: string | null;
  welcomeMessage: string | null;
}

export function InstitutionWelcomeBanner({
  name,
  logoUrl,
  welcomeMessage,
}: InstitutionWelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  if (dismissed) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-800 ring-1 ring-violet-200">
      <div className="flex items-center gap-3">
        {logoUrl && !logoBroken ? (
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white">
            <Image
              src={logoUrl}
              alt=""
              fill
              className="object-contain"
              unoptimized
              onError={() => setLogoBroken(true)}
            />
          </div>
        ) : null}
        <span>
          <span className="font-semibold">Welcome from {name}!</span>{" "}
          {welcomeMessage ?? "Glad to have you reading with us."}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 font-semibold text-violet-500 hover:text-violet-700"
      >
        Got it
      </button>
    </div>
  );
}
