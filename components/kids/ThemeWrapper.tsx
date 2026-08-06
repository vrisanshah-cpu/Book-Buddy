import type { ReactNode } from "react";
import type { ThemeConfig, ThemePattern } from "@/lib/ai-theme";

const DEFAULT_THEME: ThemeConfig = {
  gradientFrom: "#7C3AED", // kids-purple
  gradientTo: "#14B8A6", // kids-teal
  accentColor: "#FACC15", // kids-yellow
  pattern: "none",
  label: "Classic",
};

/**
 * Hand-built, safe SVG overlays — see lib/ai-theme.ts for why the AI only
 * ever picks one of these by name (`pattern`) instead of supplying markup
 * directly. Kept intentionally simple/decorative and low-opacity so text
 * on top stays readable regardless of which one is active.
 */
function PatternOverlay({ pattern, color }: { pattern: ThemePattern; color: string }) {
  if (pattern === "none") return null;

  const common = { className: "pointer-events-none absolute inset-0 h-full w-full opacity-20", "aria-hidden": true } as const;

  if (pattern === "stars") {
    const stars = [
      [10, 20], [80, 10], [150, 40], [220, 15], [280, 50],
      [40, 70], [120, 85], [200, 75], [260, 90], [320, 30],
    ];
    return (
      <svg {...common} viewBox="0 0 340 100" preserveAspectRatio="xMidYMid slice">
        {stars.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.5 : 1.5} fill={color} />
        ))}
      </svg>
    );
  }

  if (pattern === "waves") {
    return (
      <svg {...common} viewBox="0 0 340 100" preserveAspectRatio="xMidYMid slice">
        <path d="M0 30 Q 20 10, 40 30 T 80 30 T 120 30 T 160 30 T 200 30 T 240 30 T 280 30 T 320 30 T 360 30" stroke={color} strokeWidth="3" fill="none" />
        <path d="M0 60 Q 20 40, 40 60 T 80 60 T 120 60 T 160 60 T 200 60 T 240 60 T 280 60 T 320 60 T 360 60" stroke={color} strokeWidth="3" fill="none" />
      </svg>
    );
  }

  if (pattern === "dots") {
    const dots = Array.from({ length: 40 }, (_, i) => [(i % 10) * 34 + 10, Math.floor(i / 10) * 30 + 10]);
    return (
      <svg {...common} viewBox="0 0 340 100" preserveAspectRatio="xMidYMid slice">
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2} fill={color} />
        ))}
      </svg>
    );
  }

  // sparkles
  const sparkles = [
    [30, 20], [100, 60], [170, 25], [240, 70], [300, 20], [60, 80], [200, 15],
  ];
  return (
    <svg {...common} viewBox="0 0 340 100" preserveAspectRatio="xMidYMid slice">
      {sparkles.map(([x, y], i) => (
        <path
          key={i}
          d={`M${x} ${y - 6} L${x + 2} ${y - 2} L${x + 6} ${y} L${x + 2} ${y + 2} L${x} ${y + 6} L${x - 2} ${y + 2} L${x - 6} ${y} L${x - 2} ${y - 2} Z`}
          fill={color}
        />
      ))}
    </svg>
  );
}

export function ThemeWrapper({ theme, children }: { theme: ThemeConfig | null | undefined; children: ReactNode }) {
  const active = theme ?? DEFAULT_THEME;

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg"
      style={{ background: `linear-gradient(to right, ${active.gradientFrom}, ${active.gradientTo})` }}
    >
      <PatternOverlay pattern={active.pattern} color={active.accentColor} />
      <div className="relative">{children}</div>
    </div>
  );
}
