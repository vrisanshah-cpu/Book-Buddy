import type { Metadata, Viewport } from "next";
import { Nunito, Fredoka, Plus_Jakarta_Sans, DM_Sans, Lexend } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

// Dyslexia-friendly option for the accessibility toggle in kid Settings —
// see html.dyslexia-font in globals.css, which aliases --font-nunito /
// --font-fredoka to this while the toggle is on.
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Book Buddy — Your Reading Companion",
  description:
    "A safe, interactive reading companion for kids, parents, and teachers.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  other: {
    "google-adsense-account": "ca-pub-7877782569997046",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fredoka.variable} ${jakarta.variable} ${dmSans.variable} ${lexend.variable}`}
    >
      <body className="font-sans antialiased">
        <GoogleAnalytics />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}