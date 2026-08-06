"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type TextScale = "normal" | "large" | "xlarge";

const TEXT_SCALE_VALUES: Record<TextScale, string> = {
  normal: "1",
  large: "1.15",
  xlarge: "1.3",
};

interface AccessibilityContextValue {
  dyslexiaFont: boolean;
  textScale: TextScale;
  setDyslexiaFont: (value: boolean) => void;
  setTextScale: (value: TextScale) => void;
  saving: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

/**
 * Wraps the kid-facing app (app/kids/layout.tsx). Applies the dyslexia
 * font and text-scale preferences to <html> via a class + CSS variable so
 * they take effect globally (nav, dashboard, modals, everything under
 * /kids) — see the `html.dyslexia-font` rule and `--bb-text-scale` var in
 * globals.css. Both settings persist to users.dyslexia_font /
 * users.text_scale (RLS already lets a user update their own row).
 * Reverts the class/variable on unmount so leaving /kids never leaks the
 * preference into parent/teacher/admin/marketing pages.
 */
export function AccessibilityProvider({
  userId,
  initialDyslexiaFont,
  initialTextScale,
  children,
}: {
  userId: string;
  initialDyslexiaFont: boolean;
  initialTextScale: TextScale;
  children: ReactNode;
}) {
  const [dyslexiaFont, setDyslexiaFontState] = useState(initialDyslexiaFont);
  const [textScale, setTextScaleState] = useState<TextScale>(initialTextScale);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dyslexia-font", dyslexiaFont);
    root.style.setProperty("--bb-text-scale", TEXT_SCALE_VALUES[textScale]);
    return () => {
      root.classList.remove("dyslexia-font");
      root.style.removeProperty("--bb-text-scale");
    };
  }, [dyslexiaFont, textScale]);

  async function persist(patch: { dyslexia_font?: boolean; text_scale?: TextScale }) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("users").update(patch).eq("id", userId);
      if (error) {
        // Non-fatal — the toggle still applies locally for this session,
        // it just won't be remembered next time. Kid-facing UI shouldn't
        // block on this with an alert().
        console.error("Failed to save accessibility preference", error);
      }
    } finally {
      setSaving(false);
    }
  }

  function setDyslexiaFont(value: boolean) {
    setDyslexiaFontState(value);
    void persist({ dyslexia_font: value });
  }

  function setTextScale(value: TextScale) {
    setTextScaleState(value);
    void persist({ text_scale: value });
  }

  return (
    <AccessibilityContext.Provider value={{ dyslexiaFont, textScale, setDyslexiaFont, setTextScale, saving }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within an AccessibilityProvider");
  return ctx;
}
