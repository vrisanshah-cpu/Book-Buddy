"use client";

import { useAccessibility, type TextScale } from "@/components/kids/AccessibilityProvider";

const TEXT_SCALE_OPTIONS: { value: TextScale; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra large" },
];

export function AccessibilitySettingsForm() {
  const { dyslexiaFont, textScale, setDyslexiaFont, setTextScale, saving } = useAccessibility();

  return (
    <div className="space-y-6 rounded-2xl bg-white p-5 shadow-md">
      <div>
        <h2 className="font-kids-display text-xl font-bold text-slate-900">Reading & display</h2>
        <p className="mt-1 text-sm text-slate-500">
          These settings change how Book Buddy looks for you, everywhere on the site.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <label htmlFor="dyslexia-font-toggle" className="font-semibold text-slate-800">
            Dyslexia-friendly font
          </label>
          <p className="text-sm text-slate-500">Switches all text to a font that&apos;s easier to read.</p>
        </div>
        <button
          id="dyslexia-font-toggle"
          type="button"
          role="switch"
          aria-checked={dyslexiaFont}
          onClick={() => setDyslexiaFont(!dyslexiaFont)}
          className={`relative min-h-[44px] min-w-[64px] shrink-0 rounded-full transition ${
            dyslexiaFont ? "bg-kids-purple" : "bg-slate-200"
          }`}
        >
          <span
            className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white shadow transition ${
              dyslexiaFont ? "left-[calc(100%-2.25rem)]" : "left-1"
            }`}
            aria-hidden="true"
          />
          <span className="sr-only">{dyslexiaFont ? "On" : "Off"}</span>
        </button>
      </div>

      <div>
        <p className="font-semibold text-slate-800" id="text-scale-label">
          Text size
        </p>
        <p className="text-sm text-slate-500">Make text bigger and buttons easier to tap.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="text-scale-label">
          {TEXT_SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={textScale === option.value}
              onClick={() => setTextScale(option.value)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition ${
                textScale === option.value
                  ? "bg-kids-purple text-white shadow"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400" role="status" aria-live="polite">
        {saving ? "Saving…" : "Changes save automatically."}
      </p>
    </div>
  );
}
