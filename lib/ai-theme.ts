import { callGemini, hasGeminiKey } from "./gemini";

export type ThemePattern = "stars" | "waves" | "dots" | "sparkles" | "none";

export interface ThemeConfig {
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  pattern: ThemePattern;
  label: string;
}

const VALID_PATTERNS: ThemePattern[] = ["stars", "waves", "dots", "sparkles", "none"];
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const SYSTEM_PROMPT = `You design a fun color theme for a kid's reading-app profile, based on the name of a badge or title they just equipped. Reply with ONLY valid JSON, no markdown fences: {"gradientFrom":"#rrggbb","gradientTo":"#rrggbb","accentColor":"#rrggbb","pattern":"stars|waves|dots|sparkles|none","label":"2-3 word theme name"}. Colors must be valid 6-digit hex codes. Pick colors and a pattern matching the mood of the name — e.g. a space-themed item suggests deep blues/purples and "stars"; an ocean-themed one suggests teals and "waves".`;

const FALLBACK_THEME: ThemeConfig = {
  gradientFrom: "#7C3AED",
  gradientTo: "#4C1D95",
  accentColor: "#FACC15",
  pattern: "sparkles",
  label: "Classic Purple",
};

function sanitize(raw: unknown): ThemeConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const gradientFrom = typeof r.gradientFrom === "string" && HEX_COLOR_RE.test(r.gradientFrom) ? r.gradientFrom : null;
  const gradientTo = typeof r.gradientTo === "string" && HEX_COLOR_RE.test(r.gradientTo) ? r.gradientTo : null;
  const accentColor = typeof r.accentColor === "string" && HEX_COLOR_RE.test(r.accentColor) ? r.accentColor : null;
  const pattern = VALID_PATTERNS.includes(r.pattern as ThemePattern) ? (r.pattern as ThemePattern) : null;
  const label = typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 40) : null;

  if (!gradientFrom || !gradientTo || !accentColor || !pattern || !label) return null;
  return { gradientFrom, gradientTo, accentColor, pattern, label };
}

/**
 * Generates a profile theme for a badge/title name via Gemini, in a
 * strict JSON shape that's fully re-validated here (hex colors, enum
 * pattern) before ever being stored or rendered.
 *
 * Deliberately NOT asking the model for raw SVG/markup, even though the
 * original feature idea was "AI-generated SVG background art": rendering
 * arbitrary AI-authored markup into the DOM (e.g. via
 * dangerouslySetInnerHTML) is a real XSS vector, and doubly so for a
 * product built for children. Instead "pattern" only ever selects one of
 * a handful of hand-built, safe SVG templates — see PATTERN_SVGS in
 * components/kids/ThemeWrapper.tsx. The AI picks colors + which pattern
 * fits the mood; it never supplies markup directly.
 */
export async function generateThemeForItemName(name: string, rarity?: string): Promise<ThemeConfig> {
  if (!hasGeminiKey()) return FALLBACK_THEME;

  try {
    const raw = await callGemini(
      SYSTEM_PROMPT,
      [{ role: "user", text: `Item: "${name}"${rarity ? ` (${rarity})` : ""}` }],
      { jsonMode: true }
    );
    return sanitize(JSON.parse(raw)) ?? FALLBACK_THEME;
  } catch {
    return FALLBACK_THEME;
  }
}
