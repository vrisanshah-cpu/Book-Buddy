import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kids: {
          purple: "#7C3AED",
          teal: "#14B8A6",
          yellow: "#FBBF24",
          pink: "#F472B6",
          bg: "#F5F3FF",
        },
        parent: {
          primary: "#3B82F6",
          muted: "#64748B",
          bg: "#F8FAFC",
        },
        teacher: {
          primary: "#4F46E5",
          muted: "#6B7280",
          bg: "#F9FAFB",
        },
        admin: {
          primary: "#0F172A",
          muted: "#64748B",
          bg: "#F1F5F9",
        },
      },
      fontFamily: {
        kids: ["var(--font-nunito)", "sans-serif"],
        "kids-display": ["var(--font-fredoka)", "sans-serif"],
        parent: ["var(--font-jakarta)", "sans-serif"],
        teacher: ["var(--font-dm-sans)", "sans-serif"],
        admin: ["var(--font-dm-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;